/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiLink, EuiText } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { createPortalNode, InPortal } from 'react-reverse-portal';
import styled, { css } from 'styled-components';

import type { Filter, Query } from '@kbn/es-query';
import {
  ErrorEmbeddable,
  isErrorEmbeddable,
} from '../../../../../../../src/plugins/embeddable/public';
import { Loader } from '../../../common/components/loader';
import { displayErrorToast, useStateToaster } from '../../../common/components/toasters';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { Embeddable } from './embeddable';
import { createEmbeddable } from './embedded_map_helpers';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import { MapToolTip } from './map_tool_tip/map_tool_tip';
import * as i18n from './translations';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MapEmbeddable } from '../../../../../../plugins/maps/public/embeddable';
import { useKibana } from '../../../common/lib/kibana';
import { getLayerList } from './map_config';
import { sourcererSelectors } from '../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useSourcererDataView } from '../../../common/containers/sourcerer';

export const NETWORK_MAP_VISIBLE = 'network_map_visbile';

interface EmbeddableMapProps {
  maintainRatio?: boolean;
}

const EmbeddableMap = styled.div.attrs(() => ({
  className: 'siemEmbeddable__map',
}))<EmbeddableMapProps>`
  .embPanel {
    border: none;
    box-shadow: none;
  }

  .mapToolbarOverlay__button {
    display: none;
  }

  ${({ maintainRatio }) =>
    maintainRatio &&
    css`
      padding-top: calc(3 / 4 * 100%); /* 4:3 (standard) ratio */
      position: relative;

      @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.m}) {
        padding-top: calc(9 / 32 * 100%); /* 32:9 (ultra widescreen) ratio */
      }

      @media only screen and (min-width: 1441px) and (min-height: 901px) {
        padding-top: calc(9 / 21 * 100%); /* 21:9 (ultrawide) ratio */
      }

      .embPanel {
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
    `}
`;

const StyledEuiText = styled(EuiText)`
  margin-right: 16px;
`;

const StyledEuiAccordion = styled(EuiAccordion)`
  & .euiAccordion__triggerWrapper {
    padding: 16px;
  }
`;

EmbeddableMap.displayName = 'EmbeddableMap';

export interface EmbeddedMapProps {
  query: Query;
  filters: Filter[];
  startDate: string;
  endDate: string;
  setQuery: GlobalTimeArgs['setQuery'];
}

export const EmbeddedMapComponent = ({
  endDate,
  filters,
  query,
  setQuery,
  startDate,
}: EmbeddedMapProps) => {
  const [embeddable, setEmbeddable] = React.useState<MapEmbeddable | undefined | ErrorEmbeddable>(
    undefined
  );

  const { services } = useKibana();
  const { storage } = services;

  const [isError, setIsError] = useState(false);
  const [isIndexError, setIsIndexError] = useState(false);
  const [storageValue, setStorageValue] = useState(storage.get(NETWORK_MAP_VISIBLE) ?? true);

  const [, dispatchToaster] = useStateToaster();

  const getDataViewsSelector = useMemo(
    () => sourcererSelectors.getSourcererDataViewsSelector(),
    []
  );
  const { kibanaDataViews } = useDeepEqualSelector((state) => getDataViewsSelector(state));
  const { selectedPatterns } = useSourcererDataView(SourcererScopeName.default);

  const [mapIndexPatterns, setMapIndexPatterns] = useState(
    kibanaDataViews.filter((dataView) => selectedPatterns.includes(dataView.title))
  );

  // This portalNode provided by react-reverse-portal allows us re-parent the MapToolTip within our
  // own component tree instead of the embeddables (default). This is necessary to have access to
  // the Redux store, theme provider, etc, which is required to register and un-register the draggable
  // Search InPortal/OutPortal for implementation touch points
  const portalNode = React.useMemo(() => createPortalNode(), []);

  useEffect(() => {
    setMapIndexPatterns((prevMapIndexPatterns) => {
      const newIndexPatterns = kibanaDataViews.filter((dataView) =>
        selectedPatterns.includes(dataView.title)
      );
      if (!deepEqual(newIndexPatterns, prevMapIndexPatterns)) {
        if (newIndexPatterns.length === 0) {
          setIsError(true);
        }
        return newIndexPatterns;
      }
      return prevMapIndexPatterns;
    });
  }, [kibanaDataViews, selectedPatterns]);

  // Initial Load useEffect
  useEffect(() => {
    let isSubscribed = true;
    async function setupEmbeddable() {
      // Create & set Embeddable
      try {
        const embeddableObject = await createEmbeddable(
          filters,
          mapIndexPatterns,
          query,
          startDate,
          endDate,
          setQuery,
          portalNode,
          services.embeddable
        );
        if (isSubscribed) {
          if (mapIndexPatterns.length === 0) {
            setIsIndexError(true);
          } else {
            setEmbeddable(embeddableObject);
            setIsIndexError(false);
          }
        }
      } catch (e) {
        if (isSubscribed) {
          displayErrorToast(i18n.ERROR_CREATING_EMBEDDABLE, [e.message], dispatchToaster);
          setIsError(true);
        }
      }
    }
    if (embeddable == null && selectedPatterns.length > 0) {
      setupEmbeddable();
    }

    return () => {
      isSubscribed = false;
    };
  }, [
    dispatchToaster,
    endDate,
    embeddable,
    filters,
    mapIndexPatterns,
    query,
    portalNode,
    services.embeddable,
    selectedPatterns,
    setQuery,
    startDate,
  ]);

  // update layer with new index patterns
  useEffect(() => {
    const setLayerList = async () => {
      if (embeddable != null) {
        // @ts-expect-error
        await embeddable.setLayerList(getLayerList(mapIndexPatterns));
        embeddable.reload();
      }
    };
    if (embeddable != null && !isErrorEmbeddable(embeddable)) {
      setLayerList();
    }
  }, [embeddable, mapIndexPatterns]);

  // queryExpression updated useEffect
  useEffect(() => {
    if (embeddable != null) {
      embeddable.updateInput({ query });
    }
  }, [embeddable, query]);

  useEffect(() => {
    if (embeddable != null) {
      embeddable.updateInput({ filters });
    }
  }, [embeddable, filters]);

  // DateRange updated useEffect
  useEffect(() => {
    if (embeddable != null && startDate != null && endDate != null) {
      const timeRange = {
        from: new Date(startDate).toISOString(),
        to: new Date(endDate).toISOString(),
      };
      embeddable.updateInput({ timeRange });
    }
  }, [embeddable, startDate, endDate]);

  const setDefaultMapVisibility = useCallback(
    (isOpen: boolean) => {
      storage.set(NETWORK_MAP_VISIBLE, isOpen);
      setStorageValue(isOpen);
    },
    [storage]
  );

  return isError ? null : (
    <StyledEuiAccordion
      onToggle={setDefaultMapVisibility}
      id={'network-map'}
      arrowDisplay="right"
      arrowProps={{
        color: 'primary',
        'data-test-subj': `${storageValue}-toggle-network-map`,
      }}
      buttonContent={<strong>{i18n.EMBEDDABLE_HEADER_TITLE}</strong>}
      extraAction={
        <StyledEuiText size="xs">
          <EuiLink href={`${services.docLinks.links.siem.networkMap}`} target="_blank">
            {i18n.EMBEDDABLE_HEADER_HELP}
          </EuiLink>
        </StyledEuiText>
      }
      paddingSize="none"
      initialIsOpen={storageValue}
    >
      <Embeddable>
        <InPortal node={portalNode}>
          <MapToolTip />
        </InPortal>

        <EmbeddableMap maintainRatio={!isIndexError}>
          {isIndexError ? (
            <IndexPatternsMissingPrompt data-test-subj="missing-prompt" />
          ) : embeddable != null ? (
            <services.embeddable.EmbeddablePanel embeddable={embeddable} />
          ) : (
            <Loader data-test-subj="loading-panel" overlay size="xl" />
          )}
        </EmbeddableMap>
      </Embeddable>
    </StyledEuiAccordion>
  );
};

EmbeddedMapComponent.displayName = 'EmbeddedMapComponent';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);

EmbeddedMap.displayName = 'EmbeddedMap';
