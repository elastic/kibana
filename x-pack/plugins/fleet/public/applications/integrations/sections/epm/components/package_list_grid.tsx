/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, FunctionComponent } from 'react';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiSearchBar,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Loading } from '../../../components';
import { useLocalSearch, searchIdField } from '../../../hooks';

import type { IntegrationCardItem } from '../../../../../../common/types/models';

import { PackageCard } from './package_card';

export interface Props {
  isLoading?: boolean;
  controls?: ReactNode | ReactNode[];
  title?: string;
  list: IntegrationCardItem[];
  featuredList?: JSX.Element | null;
  initialSearch?: string;
  setSelectedCategory: (category: string) => void;
  onSearchChange: (search: string) => void;
  showMissingIntegrationMessage?: boolean;
  callout?: JSX.Element | null;
}

export const PackageListGrid: FunctionComponent<Props> = ({
  isLoading,
  controls,
  title,
  list,
  initialSearch,
  onSearchChange,
  setSelectedCategory,
  showMissingIntegrationMessage = false,
  featuredList = null,
  callout,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const localSearchRef = useLocalSearch(list);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [windowScrollY] = useState(window.scrollY);

  useEffect(() => {
    const menuRefCurrent = menuRef.current;
    const onScroll = () => {
      if (menuRefCurrent) {
        setIsSticky(menuRefCurrent?.getBoundingClientRect().top < 110);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [windowScrollY, isSticky]);

  const onQueryChange = ({
    queryText: userInput,
    error,
  }: {
    queryText: string;
    error: { message: string } | null;
  }) => {
    if (!error) {
      onSearchChange(userInput);
      setSearchTerm(userInput);
    }
  };

  const resetQuery = () => {
    setSearchTerm('');
  };

  const controlsContent = <ControlsColumn title={title} controls={controls} sticky={isSticky} />;
  let gridContent: JSX.Element;

  if (isLoading || !localSearchRef.current) {
    gridContent = <Loading />;
  } else {
    const filteredList = searchTerm
      ? list.filter((item) =>
          (localSearchRef.current!.search(searchTerm) as IntegrationCardItem[])
            .map((match) => match[searchIdField])
            .includes(item[searchIdField])
        )
      : list;
    gridContent = (
      <GridColumn
        list={filteredList}
        showMissingIntegrationMessage={showMissingIntegrationMessage}
      />
    );
  }

  return (
    <>
      {featuredList}
      <div ref={menuRef}>
        <EuiFlexGroup alignItems="flexStart" gutterSize="xl">
          <EuiFlexItem grow={1} className={isSticky ? 'kbnStickyMenu' : ''}>
            {controlsContent}
          </EuiFlexItem>
          <EuiFlexItem grow={5}>
            <EuiSearchBar
              query={searchTerm || undefined}
              box={{
                placeholder: i18n.translate('xpack.fleet.epmList.searchPackagesPlaceholder', {
                  defaultMessage: 'Search for integrations',
                }),
                incremental: true,
              }}
              onChange={onQueryChange}
            />
            {callout ? (
              <>
                <EuiSpacer />
                {callout}
              </>
            ) : null}
            <EuiSpacer />
            {gridContent}
            {showMissingIntegrationMessage && (
              <>
                <EuiSpacer />
                <MissingIntegrationContent
                  resetQuery={resetQuery}
                  setSelectedCategory={setSelectedCategory}
                />
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};

interface ControlsColumnProps {
  controls: ReactNode;
  title: string | undefined;
  sticky: boolean;
}

function ControlsColumn({ controls, title, sticky }: ControlsColumnProps) {
  let titleContent;
  if (title) {
    titleContent = (
      <>
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
      </>
    );
  }
  return (
    <EuiFlexGroup direction="column" className={sticky ? 'kbnStickyMenu' : ''} gutterSize="none">
      {titleContent}
      {controls}
    </EuiFlexGroup>
  );
}

interface GridColumnProps {
  list: IntegrationCardItem[];
  showMissingIntegrationMessage?: boolean;
}

function GridColumn({ list, showMissingIntegrationMessage = false }: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.length ? (
        list.map((item) => {
          return (
            <EuiFlexItem key={item.id}>
              <PackageCard {...item} />
            </EuiFlexItem>
          );
        })
      ) : (
        <EuiFlexItem grow={3}>
          <EuiText>
            <p>
              {showMissingIntegrationMessage ? (
                <FormattedMessage
                  id="xpack.fleet.epmList.missingIntegrationPlaceholder"
                  defaultMessage="We didn't find any integrations matching your search term. Please try another keyword or browse using the categories on the left."
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.epmList.noPackagesFoundPlaceholder"
                  defaultMessage="No integrations found"
                />
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGrid>
  );
}

interface MissingIntegrationContentProps {
  resetQuery: () => void;
  setSelectedCategory: (category: string) => void;
}

function MissingIntegrationContent({
  resetQuery,
  setSelectedCategory,
}: MissingIntegrationContentProps) {
  const handleCustomInputsLinkClick = useCallback(() => {
    resetQuery();
    setSelectedCategory('custom');
  }, [resetQuery, setSelectedCategory]);

  return (
    <EuiText size="s" color="subdued">
      <p>
        <FormattedMessage
          id="xpack.fleet.integrations.missing"
          defaultMessage="Don't see an integration? Collect any logs or metrics using our {customInputsLink}. Request new integrations in our {forumLink}."
          values={{
            customInputsLink: (
              <EuiLink onClick={handleCustomInputsLinkClick}>
                <FormattedMessage
                  id="xpack.fleet.integrations.customInputsLink"
                  defaultMessage="custom inputs"
                />
              </EuiLink>
            ),
            forumLink: (
              <EuiLink href="https://discuss.elastic.co/tag/integrations" external target="_blank">
                <FormattedMessage
                  id="xpack.fleet.integrations.discussForumLink"
                  defaultMessage="forum"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
}
