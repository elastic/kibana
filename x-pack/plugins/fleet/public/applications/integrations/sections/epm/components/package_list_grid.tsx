/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, FunctionComponent } from 'react';
import { useMemo } from 'react';
import React, { useCallback, useState, useRef, useEffect } from 'react';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiFieldSearch,
  EuiText,
  useEuiTheme,
  EuiIcon,
  EuiScreenReaderOnly,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Loading } from '../../../components';
import { useLocalSearch, searchIdField } from '../../../hooks';

import type { IntegrationCardItem } from '../../../../../../common/types/models';

import type { ExtendedIntegrationCategory, CategoryFacet } from '../screens/home/category_facets';

import { promoteFeaturedIntegrations } from './utils';

import { PackageCard } from './package_card';

export interface Props {
  isLoading?: boolean;
  controls?: ReactNode | ReactNode[];
  title?: string;
  list: IntegrationCardItem[];
  initialSearch?: string;
  selectedCategory: ExtendedIntegrationCategory;
  setSelectedCategory: (category: string) => void;
  categories: CategoryFacet[];
  onSearchChange: (search: string) => void;
  showMissingIntegrationMessage?: boolean;
  callout?: JSX.Element | null;
  showCardLabels?: boolean;
}

export const PackageListGrid: FunctionComponent<Props> = ({
  isLoading,
  controls,
  title,
  list,
  initialSearch,
  onSearchChange,
  selectedCategory,
  setSelectedCategory,
  categories,
  showMissingIntegrationMessage = false,
  callout,
  showCardLabels = true,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const localSearchRef = useLocalSearch(list);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [windowScrollY] = useState(window.scrollY);
  const { euiTheme } = useEuiTheme();

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

  const onQueryChange = (e: any) => {
    const queryText = e.target.value;
    setSearchTerm(queryText);
    onSearchChange(queryText);
  };

  const resetQuery = () => {
    setSearchTerm('');
  };

  const selectedCategoryTitle = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)?.title
    : undefined;

  const filteredPromotedList = useMemo(() => {
    if (isLoading) return [];
    const filteredList = searchTerm
      ? list.filter((item) =>
          (localSearchRef.current!.search(searchTerm) as IntegrationCardItem[])
            .map((match) => match[searchIdField])
            .includes(item[searchIdField])
        )
      : list;

    return promoteFeaturedIntegrations(filteredList, selectedCategory);
  }, [isLoading, list, localSearchRef, searchTerm, selectedCategory]);

  const controlsContent = <ControlsColumn title={title} controls={controls} sticky={isSticky} />;
  let gridContent: JSX.Element;

  if (isLoading || !localSearchRef.current) {
    gridContent = <Loading />;
  } else {
    gridContent = (
      <GridColumn
        list={filteredPromotedList}
        showMissingIntegrationMessage={showMissingIntegrationMessage}
        showCardLabels={showCardLabels}
      />
    );
  }

  return (
    <>
      <div ref={menuRef}>
        <EuiFlexGroup
          alignItems="flexStart"
          gutterSize="xl"
          data-test-subj="epmList.integrationCards"
        >
          <EuiFlexItem grow={1} className={isSticky ? 'kbnStickyMenu' : ''}>
            {controlsContent}
          </EuiFlexItem>
          <EuiFlexItem grow={5}>
            <EuiFieldSearch
              data-test-subj="epmList.searchBar"
              placeholder={i18n.translate('xpack.fleet.epmList.searchPackagesPlaceholder', {
                defaultMessage: 'Search for integrations',
              })}
              value={searchTerm}
              onChange={(e) => onQueryChange(e)}
              isClearable={true}
              incremental={true}
              fullWidth={true}
              prepend={
                selectedCategoryTitle ? (
                  <EuiText
                    data-test-subj="epmList.categoryBadge"
                    size="xs"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: euiTheme.font.weight.bold,
                      backgroundColor: euiTheme.colors.lightestShade,
                    }}
                  >
                    <EuiScreenReaderOnly>
                      <span>Searching category: </span>
                    </EuiScreenReaderOnly>
                    {selectedCategoryTitle}
                    <button
                      data-test-subj="epmList.categoryBadge.closeBtn"
                      onClick={() => {
                        setSelectedCategory('');
                      }}
                      aria-label="Remove filter"
                      style={{
                        padding: euiTheme.size.xs,
                        paddingTop: '2px',
                      }}
                    >
                      <EuiIcon
                        type="cross"
                        color="text"
                        size="s"
                        style={{
                          width: 'auto',
                          padding: 0,
                          backgroundColor: euiTheme.colors.lightestShade,
                        }}
                      />
                    </button>
                  </EuiText>
                ) : undefined
              }
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
  showCardLabels?: boolean;
}

function GridColumn({
  list,
  showMissingIntegrationMessage = false,
  showCardLabels = false,
}: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.length ? (
        list.map((item) => {
          return (
            <EuiFlexItem key={item.id}>
              <PackageCard {...item} showLabels={showCardLabels} />
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
