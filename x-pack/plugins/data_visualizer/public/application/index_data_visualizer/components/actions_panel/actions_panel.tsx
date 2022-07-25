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
import { DataView } from '@kbn/data-views-plugin/public';
import { flatten } from 'lodash';
import { LinkCardProps } from '../../../common/components/link_card/link_card';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { useUrlState } from '../../../common/util/url_state';
import { LinkCard } from '../../../common/components/link_card';
import { GetAdditionalLinks } from '../../../common/components/results_links';
import { isDefined } from '../../../common/util/is_defined';

interface Props {
  dataView: DataView;
  searchString?: string | { [key: string]: any };
  searchQueryLanguage?: string;
  getAdditionalLinks?: GetAdditionalLinks;
}

export const ActionsPanel: FC<Props> = ({
  dataView,
  searchString,
  searchQueryLanguage,
  getAdditionalLinks,
}) => {
  const [globalState] = useUrlState('_g');

  const [discoverLink, setDiscoverLink] = useState('');
  const [asyncHrefCards, setAsyncHrefCards] = useState<LinkCardProps[]>();

  const {
    services: {
      data,
      application: { capabilities },
      discover,
    },
  } = useDataVisualizerKibana();

  useEffect(() => {
    let unmounted = false;

    const indexPatternId = dataView.id;
    const indexPatternTitle = dataView.title;
    const getDiscoverUrl = async (): Promise<void> => {
      const isDiscoverAvailable = capabilities.discover?.show ?? false;
      if (!isDiscoverAvailable) return;
      if (!discover.locator) {
        // eslint-disable-next-line no-console
        console.error('Discover locator not available');
        return;
      }
      const discoverUrl = await discover.locator.getUrl({
        indexPatternId,
        filters: data.query.filterManager.getFilters() ?? [],
        query:
          searchString && searchQueryLanguage !== undefined
            ? { query: searchString, language: searchQueryLanguage }
            : undefined,
        timeRange: globalState?.time ? globalState.time : undefined,
        refreshInterval: globalState?.refreshInterval ? globalState.refreshInterval : undefined,
      });
      if (unmounted) return;
      setDiscoverLink(discoverUrl);
    };

    if (Array.isArray(getAdditionalLinks) && indexPatternId !== undefined) {
      Promise.all(
        getAdditionalLinks.map(async (asyncCardGetter) => {
          const results = await asyncCardGetter({
            dataViewId: indexPatternId,
            dataViewTitle: indexPatternTitle,
          });
          if (Array.isArray(results)) {
            return await Promise.all(
              results.map(async (c) => ({
                ...c,
                canDisplay: await c.canDisplay(),
                href: await c.getUrl(),
              }))
            );
          }
        })
      ).then((cards) => {
        setAsyncHrefCards(
          flatten(cards)
            .filter(isDefined)
            .filter((d) => d.canDisplay === true)
        );
      });
    }
    getDiscoverUrl();

    return () => {
      unmounted = true;
    };
  }, [
    dataView,
    searchString,
    searchQueryLanguage,
    globalState,
    capabilities,
    discover,
    data.query,
    getAdditionalLinks,
  ]);

  // Note we use display:none for the DataRecognizer section as it needs to be
  // passed the recognizerResults object, and then run the recognizer check which
  // controls whether the recognizer section is ultimately displayed.
  return (
    <div data-test-subj="dataVisualizerActionsPanel">
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
          <EuiSpacer size="m" />
        </>
      )}

      {Array.isArray(asyncHrefCards) &&
        asyncHrefCards.map((link) => (
          <>
            <LinkCard
              href={link.href}
              icon={link.icon}
              description={link.description}
              title={link.title}
              data-test-subj={link['data-test-subj']}
            />
            <EuiSpacer size="m" />
          </>
        ))}
    </div>
  );
};
