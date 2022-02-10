/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  DISCOVER_APP_URL_GENERATOR,
  DiscoverUrlGeneratorState,
} from '../../../../../../../../src/plugins/discover/public';
import type { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { useUrlState } from '../../../common/util/url_state';
import { LinkCard } from '../../../common/components/link_card';
import { ResultLink } from '../../../common/components/results_links';

interface Props {
  indexPattern: IndexPattern;
  searchString?: string | { [key: string]: any };
  searchQueryLanguage?: string;
  additionalLinks: ResultLink[];
}

export const ActionsPanel: FC<Props> = ({
  indexPattern,
  searchString,
  searchQueryLanguage,
  additionalLinks,
}) => {
  const [globalState] = useUrlState('_g');

  const [discoverLink, setDiscoverLink] = useState('');
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

  const {
    services: {
      data,
      application: { capabilities },
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  } = useDataVisualizerKibana();

  useEffect(() => {
    let unmounted = false;

    const indexPatternId = indexPattern.id;
    const getDiscoverUrl = async (): Promise<void> => {
      const isDiscoverAvailable = capabilities.discover?.show ?? false;
      if (!isDiscoverAvailable) {
        return;
      }

      const state: DiscoverUrlGeneratorState = {
        indexPatternId,
      };

      state.filters = data.query.filterManager.getFilters() ?? [];

      if (searchString && searchQueryLanguage !== undefined) {
        state.query = { query: searchString, language: searchQueryLanguage };
      }
      if (globalState?.time) {
        state.timeRange = globalState.time;
      }
      if (globalState?.refreshInterval) {
        state.refreshInterval = globalState.refreshInterval;
      }

      let discoverUrlGenerator;
      try {
        discoverUrlGenerator = getUrlGenerator(DISCOVER_APP_URL_GENERATOR);
      } catch (error) {
        // ignore error thrown when url generator is not available
        return;
      }

      const discoverUrl = await discoverUrlGenerator.createUrl(state);
      if (!unmounted) {
        setDiscoverLink(discoverUrl);
      }
    };

    Promise.all(
      additionalLinks.map(async ({ canDisplay, getUrl }) => {
        if ((await canDisplay({ indexPatternId })) === false) {
          return null;
        }
        return getUrl({ globalState, indexPatternId });
      })
    ).then((urls) => {
      const linksById = urls.reduce((acc, url, i) => {
        if (url !== null) {
          acc[additionalLinks[i].id] = url;
        }
        return acc;
      }, {} as Record<string, string>);
      setGeneratedLinks(linksById);
    });

    getDiscoverUrl();
    return () => {
      unmounted = true;
    };
  }, [
    indexPattern,
    searchString,
    searchQueryLanguage,
    globalState,
    capabilities,
    getUrlGenerator,
    additionalLinks,
    data.query,
  ]);

  // Note we use display:none for the DataRecognizer section as it needs to be
  // passed the recognizerResults object, and then run the recognizer check which
  // controls whether the recognizer section is ultimately displayed.
  return (
    <div data-test-subj="dataVisualizerActionsPanel">
      {additionalLinks
        .filter(({ id }) => generatedLinks[id] !== undefined)
        .map((link) => (
          <>
            <LinkCard
              href={generatedLinks[link.id]}
              icon={link.icon}
              description={link.description}
              title={link.title}
              data-test-subj={link.dataTestSubj}
            />
            <EuiSpacer size="m" />
          </>
        ))}
      {discoverLink && (
        <>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.dataVisualizer.index.actionsPanel.exploreTitle"
                defaultMessage="Explore your data"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <LinkCard
            href={discoverLink}
            icon="discoverApp"
            description={i18n.translate(
              'xpack.dataVisualizer.index.actionsPanel.viewIndexInDiscoverDescription',
              {
                defaultMessage: 'Explore the documents in your index.',
              }
            )}
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.index.actionsPanel.discoverAppTitle"
                defaultMessage="Discover"
              />
            }
            data-test-subj="dataVisualizerViewInDiscoverCard"
          />
        </>
      )}
    </div>
  );
};
