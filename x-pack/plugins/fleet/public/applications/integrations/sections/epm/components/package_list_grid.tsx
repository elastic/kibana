/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, FunctionComponent } from 'react';
import { useMemo } from 'react';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { css } from '@emotion/react';

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
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Loading } from '../../../components';
import { useLocalSearch, searchIdField } from '../../../hooks';

import type { IntegrationCardItem } from '../../../../../../common/types/models';

import type { ExtendedIntegrationCategory, CategoryFacet } from '../screens/home/category_facets';

import type { IntegrationsURLParameters } from '../screens/home/hooks/use_available_packages';

import { ExperimentalFeaturesService } from '../../../services';

import { promoteFeaturedIntegrations } from './utils';

import { PackageCard } from './package_card';

export interface Props {
  isLoading?: boolean;
  controls?: ReactNode | ReactNode[];
  list: IntegrationCardItem[];
  searchTerm: string;
  setSearchTerm: (search: string) => void;
  selectedCategory: ExtendedIntegrationCategory;
  setCategory: (category: ExtendedIntegrationCategory) => void;
  categories: CategoryFacet[];
  setUrlandReplaceHistory: (params: IntegrationsURLParameters) => void;
  setUrlandPushHistory: (params: IntegrationsURLParameters) => void;
  callout?: JSX.Element | null;
  // Props used only in AvailablePackages component:
  showCardLabels?: boolean;
  title?: string;
  availableSubCategories?: CategoryFacet[];
  selectedSubCategory?: CategoryFacet;
  setSelectedSubCategory?: (c: CategoryFacet | undefined) => void;
  showMissingIntegrationMessage?: boolean;
}

export const PackageListGrid: FunctionComponent<Props> = ({
  isLoading,
  controls,
  title,
  list,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setCategory,
  categories,
  availableSubCategories,
  setSelectedSubCategory,
  selectedSubCategory,
  setUrlandReplaceHistory,
  setUrlandPushHistory,
  showMissingIntegrationMessage = false,
  callout,
  showCardLabels = true,
}) => {
  const localSearchRef = useLocalSearch(list);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [windowScrollY] = useState(window.scrollY);
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setPopover] = useState(false);

  const MAX_SUBCATEGORIES_NUMBER = 6;

  const { showIntegrationsSubcategories } = ExperimentalFeaturesService.get();

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

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const onQueryChange = (e: any) => {
    const queryText = e.target.value;
    setSearchTerm(queryText);
    setUrlandReplaceHistory({
      searchString: queryText,
      categoryId: selectedCategory,
      subCategoryId: selectedSubCategory?.id,
    });
  };

  const resetQuery = () => {
    setSearchTerm('');
    setUrlandReplaceHistory({ searchString: '', categoryId: '', subCategoryId: '' });
  };

  const onSubCategoryClick = useCallback(
    (subCategory: CategoryFacet) => {
      if (setSelectedSubCategory) setSelectedSubCategory(subCategory);
      setUrlandPushHistory({
        categoryId: selectedCategory,
        subCategoryId: subCategory.id,
      });
    },
    [selectedCategory, setSelectedSubCategory, setUrlandPushHistory]
  );

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

  const splitSubcategories = (
    subcategories: CategoryFacet[] | undefined
  ): { visibleSubCategories?: CategoryFacet[]; hiddenSubCategories?: CategoryFacet[] } => {
    if (!subcategories) return {};
    else if (subcategories && subcategories?.length < MAX_SUBCATEGORIES_NUMBER) {
      return { visibleSubCategories: subcategories, hiddenSubCategories: [] };
    } else if (subcategories && subcategories?.length >= MAX_SUBCATEGORIES_NUMBER) {
      return {
        visibleSubCategories: subcategories.slice(0, MAX_SUBCATEGORIES_NUMBER),
        hiddenSubCategories: subcategories.slice(MAX_SUBCATEGORIES_NUMBER),
      };
    }
    return {};
  };

  const splitSubcat = splitSubcategories(availableSubCategories);
  const { visibleSubCategories } = splitSubcat;
  const hiddenSubCategoriesItems = useMemo(() => {
    return splitSubcat?.hiddenSubCategories?.map((subCategory) => {
      return (
        <EuiContextMenuItem
          key={subCategory.id}
          onClick={() => {
            onSubCategoryClick(subCategory);
            closePopover();
          }}
        >
          {subCategory.title}
        </EuiContextMenuItem>
      );
    });
  }, [onSubCategoryClick, splitSubcat.hiddenSubCategories]);

  return (
    <>
      <div ref={menuRef}>
        <EuiFlexGroup
          alignItems="flexStart"
          gutterSize="xl"
          data-test-subj="epmList.integrationCards"
        >
          <EuiFlexItem
            data-test-subj="epmList.controlsSideColumn"
            grow={1}
            className={isSticky ? 'kbnStickyMenu' : ''}
          >
            <ControlsColumn controls={controls} title={title} sticky={isSticky} />
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
                        setCategory('');
                        if (setSelectedSubCategory) setSelectedSubCategory(undefined);
                        setUrlandReplaceHistory({
                          searchString: '',
                          categoryId: '',
                          subCategoryId: '',
                        });
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
            {showIntegrationsSubcategories && availableSubCategories?.length ? <EuiSpacer /> : null}
            {showIntegrationsSubcategories ? (
              <EuiFlexGroup
                data-test-subj="epmList.subcategoriesRow"
                justifyContent="flexStart"
                direction="row"
                gutterSize="s"
                style={{
                  maxWidth: 943,
                }}
              >
                {visibleSubCategories?.map((subCategory) => (
                  <EuiFlexItem grow={false} key={subCategory.id}>
                    <EuiButton
                      color="text"
                      aria-label={subCategory?.title}
                      onClick={() => onSubCategoryClick(subCategory)}
                    >
                      <FormattedMessage
                        id="xpack.fleet.epmList.subcategoriesButton"
                        defaultMessage="{subcategory}"
                        values={{
                          subcategory: subCategory.title,
                        }}
                      />
                    </EuiButton>
                  </EuiFlexItem>
                ))}
                {hiddenSubCategoriesItems?.length ? (
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      data-test-subj="epmList.showMoreSubCategoriesButton"
                      id="moreSubCategories"
                      button={
                        <EuiButtonIcon
                          display="base"
                          onClick={onButtonClick}
                          iconType="boxesHorizontal"
                          aria-label="Show more subcategories"
                          size="m"
                        />
                      }
                      isOpen={isPopoverOpen}
                      closePopover={closePopover}
                      panelPaddingSize="none"
                      anchorPosition="downLeft"
                    >
                      <EuiContextMenuPanel size="s" items={hiddenSubCategoriesItems} />
                    </EuiPopover>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            ) : null}
            {callout ? (
              <>
                <EuiSpacer />
                {callout}
              </>
            ) : null}
            <EuiSpacer />
            <GridColumn
              isLoading={isLoading || !localSearchRef.current}
              list={filteredPromotedList}
              showMissingIntegrationMessage={showMissingIntegrationMessage}
              showCardLabels={showCardLabels}
            />
            {showMissingIntegrationMessage && (
              <>
                <EuiSpacer />
                <MissingIntegrationContent
                  setUrlandPushHistory={setUrlandPushHistory}
                  resetQuery={resetQuery}
                  setSelectedCategory={setCategory}
                />
                <EuiSpacer />
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

const ControlsColumn = ({ controls, title, sticky }: ControlsColumnProps) => {
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
};

interface GridColumnProps {
  list: IntegrationCardItem[];
  isLoading: boolean;
  showMissingIntegrationMessage?: boolean;
  showCardLabels?: boolean;
}

const GridColumn = ({
  list,
  showMissingIntegrationMessage = false,
  showCardLabels = false,
  isLoading,
}: GridColumnProps) => {
  if (isLoading) return <Loading />;

  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.length ? (
        list.map((item) => {
          return (
            <EuiFlexItem
              key={item.id}
              // Ensure that cards wrapped in EuiTours/EuiPopovers correctly inherit the full grid row height
              css={css`
                & > .euiPopover,
                & > .euiPopover > .euiPopover__anchor,
                & > .euiPopover > .euiPopover__anchor > .euiCard {
                  height: 100%;
                }
              `}
            >
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
};

interface MissingIntegrationContentProps {
  resetQuery: () => void;
  setSelectedCategory: (category: ExtendedIntegrationCategory) => void;
  setUrlandPushHistory: (params: IntegrationsURLParameters) => void;
}

const MissingIntegrationContent = ({
  resetQuery,
  setSelectedCategory,
  setUrlandPushHistory,
}: MissingIntegrationContentProps) => {
  const handleCustomInputsLinkClick = useCallback(() => {
    resetQuery();
    setSelectedCategory('custom');
    setUrlandPushHistory({
      categoryId: 'custom',
      subCategoryId: '',
    });
  }, [resetQuery, setSelectedCategory, setUrlandPushHistory]);

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
};
