/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { createPortalNode, InPortal } from 'react-reverse-portal';
import styled, { css } from 'styled-components';

import { ErrorEmbeddable } from '../../../../../../../src/plugins/embeddable/public';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { getIndexPatternTitleIdMapping } from '../../../common/hooks/api/helpers';
import { useIndexPatterns } from '../../../common/hooks/use_index_patterns';
import { Loader } from '../../../common/components/loader';
import { displayErrorToast, useStateToaster } from '../../../common/components/toasters';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { Embeddable } from './embeddable';
import { EmbeddableHeader } from './embeddable_header';
import { createEmbeddable, findMatchingIndexPatterns } from './embedded_map_helpers';
import { IndexPatternsMissingPrompt } from './index_patterns_missing_prompt';
import { MapToolTip } from './map_tool_tip/map_tool_tip';
import * as i18n from './translations';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MapEmbeddable } from '../../../../../../plugins/maps/public/embeddable';
import { Query, Filter } from '../../../../../../../src/plugins/data/public';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';

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
EmbeddableMap.displayName = 'EmbeddableMap';

export interface EmbeddedMapProps {
  query: Query;
  filters: Filter[];
  startDate: number;
  endDate: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isIndexError, setIsIndexError] = useState(false);

  const [, dispatchToaster] = useStateToaster();
  const [loadingKibanaIndexPatterns, kibanaIndexPatterns] = useIndexPatterns();
  const [siemDefaultIndices] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);

  // This portalNode provided by react-reverse-portal allows us re-parent the MapToolTip within our
  // own component tree instead of the embeddables (default). This is necessary to have access to
  // the Redux store, theme provider, etc, which is required to register and un-register the draggable
  // Search InPortal/OutPortal for implementation touch points
  const portalNode = React.useMemo(() => createPortalNode(), []);

  const { services } = useKibana();

  // Initial Load useEffect
  useEffect(() => {
    let isSubscribed = true;
    async function setupEmbeddable() {
      // Ensure at least one `securitySolution:defaultIndex` kibana index pattern exists before creating embeddable
      const matchingIndexPatterns = findMatchingIndexPatterns({
        kibanaIndexPatterns,
        siemDefaultIndices,
      });

      if (matchingIndexPatterns.length === 0 && isSubscribed) {
        setIsLoading(false);
        setIsIndexError(true);
        return;
      }

      // Create & set Embeddable
      try {
        const embeddableObject = await createEmbeddable(
          filters,
          getIndexPatternTitleIdMapping(matchingIndexPatterns),
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
          displayErrorToast(i18n.ERROR_CREATING_EMBEDDABLE, [e.message], dispatchToaster);
          setIsError(true);
        }
      }
      if (isSubscribed) {
        setIsLoading(false);
      }
    }

    if (!loadingKibanaIndexPatterns) {
      setupEmbeddable();
    }
    return () => {
      isSubscribed = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingKibanaIndexPatterns, kibanaIndexPatterns]);

  // queryExpression updated useEffect
  useEffect(() => {
    if (embeddable != null) {
      embeddable.updateInput({ query });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (embeddable != null) {
      embeddable.updateInput({ filters });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // DateRange updated useEffect
  useEffect(() => {
    if (embeddable != null && startDate != null && endDate != null) {
      const timeRange = {
        from: new Date(startDate).toISOString(),
        to: new Date(endDate).toISOString(),
      };
      embeddable.updateInput({ timeRange });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  return isError ? null : (
    <Embeddable>
      <EmbeddableHeader title={i18n.EMBEDDABLE_HEADER_TITLE}>
        <EuiText size="xs">
          <EuiLink
            href={`${services.docLinks.ELASTIC_WEBSITE_URL}guide/en/siem/guide/${services.docLinks.DOC_LINK_VERSION}/conf-map-ui.html`}
            target="_blank"
          >
            {i18n.EMBEDDABLE_HEADER_HELP}
          </EuiLink>
        </EuiText>
      </EmbeddableHeader>

      <InPortal node={portalNode}>
        <MapToolTip />
      </InPortal>

      <EmbeddableMap maintainRatio={!isIndexError}>
        {embeddable != null ? (
          <services.embeddable.EmbeddablePanel embeddable={embeddable} />
        ) : !isLoading && isIndexError ? (
          <IndexPatternsMissingPrompt data-test-subj="missing-prompt" />
        ) : (
          <Loader data-test-subj="loading-panel" overlay size="xl" />
        )}
      </EmbeddableMap>
    </Embeddable>
  );
};

EmbeddedMapComponent.displayName = 'EmbeddedMapComponent';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);

EmbeddedMap.displayName = 'EmbeddedMap';
