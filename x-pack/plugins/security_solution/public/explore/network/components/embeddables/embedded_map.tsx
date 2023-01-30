/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiLink, EuiText } from '@elastic/eui';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { createHtmlPortalNode, InPortal } from 'react-reverse-portal';
import styled, { css } from 'styled-components';

import type { Filter, Query } from '@kbn/es-query';
import type { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { MapEmbeddable } from '@kbn/maps-plugin/public/embeddable';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsFieldInIndexPattern } from '../../../containers/fields';
import { Loader } from '../../../../common/components/loader';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import { Embeddable } from './embeddable';
import { createEmbeddable } from './create_embeddable';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import { MapToolTip } from './map_tool_tip/map_tool_tip';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { getLayerList, getRequiredMapsFields } from './map_config';
import { sourcererSelectors } from '../../../../common/store/sourcerer';
import type { SourcererDataView } from '../../../../common/store/sourcerer/model';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';

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

  const { addError } = useAppToasts();

  const getDataViewsSelector = useMemo(
    () => sourcererSelectors.getSourcererDataViewsSelector(),
    []
  );
  const { kibanaDataViews } = useDeepEqualSelector((state) => getDataViewsSelector(state));
  const { selectedPatterns } = useSourcererDataView(SourcererScopeName.default);

  const isFieldInIndexPattern = useIsFieldInIndexPattern();

  const [mapDataViews, setMapDataViews] = useState<SourcererDataView[]>([]);

  const availableDataViews = useMemo(() => {
    const dataViews = kibanaDataViews.filter((dataView) =>
      selectedPatterns.includes(dataView.title)
    );
    if (selectedPatterns.length > 0 && dataViews.length === 0) {
      setIsIndexError(true);
    }
    return dataViews;
  }, [kibanaDataViews, selectedPatterns]);

  useEffect(() => {
    let canceled = false;

    const fetchData = async () => {
      try {
        const apiResponse = await Promise.all(
          availableDataViews.map(async ({ title }) =>
            isFieldInIndexPattern(title, getRequiredMapsFields(title))
          )
        );
        // ensures only index patterns with maps fields are passed
        const goodDataViews = availableDataViews.filter((_, i) => apiResponse[i] ?? false);
        if (!canceled) {
          setMapDataViews(goodDataViews);
        }
      } catch (e) {
        if (!canceled) {
          setMapDataViews([]);
          addError(e, { title: i18n.ERROR_CREATING_EMBEDDABLE });
          setIsError(true);
        }
      }
    };
    if (availableDataViews.length) {
      fetchData();
    }
    return () => {
      canceled = true;
    };
  }, [addError, availableDataViews, isFieldInIndexPattern]);

  // This portalNode provided by react-reverse-portal allows us re-parent the MapToolTip within our
  // own component tree instead of the embeddables (default). This is necessary to have access to
  // the Redux store, theme provider, etc, which is required to register and un-register the draggable
  // Search InPortal/OutPortal for implementation touch points
  const portalNode = React.useMemo(() => createHtmlPortalNode(), []);

  // Initial Load useEffect
  useEffect(() => {
    let isSubscribed = true;
    async function setupEmbeddable() {
      // Create & set Embeddable
      try {
        const embeddableObject = await createEmbeddable(
          filters,
          mapDataViews,
          query,
          startDate,
          endDate,
          setQuery,
          portalNode,
          services.embeddable
        );
        if (isSubscribed) {
          setEmbeddable(embeddableObject);
        }
      } catch (e) {
        if (isSubscribed) {
          addError(e, { title: i18n.ERROR_CREATING_EMBEDDABLE });
          setIsError(true);
        }
      }
    }

    if (embeddable == null && selectedPatterns.length > 0 && !isIndexError) {
      setupEmbeddable();
    }

    return () => {
      isSubscribed = false;
    };
  }, [
    addError,
    endDate,
    embeddable,
    filters,
    mapDataViews,
    query,
    portalNode,
    services.embeddable,
    selectedPatterns,
    setQuery,
    startDate,
    isIndexError,
  ]);

  // update layer with new index patterns
  useEffect(() => {
    const setLayerList = async () => {
      if (embeddable != null && mapDataViews.length) {
        // @ts-expect-error
        await embeddable.setLayerList(getLayerList(mapDataViews));
        embeddable.reload();
      }
    };
    if (embeddable != null && !isErrorEmbeddable(embeddable)) {
      setLayerList();
    }
  }, [embeddable, mapDataViews]);

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

  const content = useMemo(() => {
    if (!storageValue) {
      return null;
    }
    return (
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
    );
  }, [embeddable, isIndexError, portalNode, services, storageValue]);

  return isError ? null : (
    <StyledEuiAccordion
      data-test-subj="EmbeddedMapComponent"
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
      {content}
    </StyledEuiAccordion>
  );
};

EmbeddedMapComponent.displayName = 'EmbeddedMapComponent';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);

EmbeddedMap.displayName = 'EmbeddedMap';
