/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useRef, useEffect } from 'react';
import { css } from '@emotion/react';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiAutoSizer,
} from '@elastic/eui';

import { VariableSizeList as List } from 'react-window';
import { FormattedMessage } from '@kbn/i18n-react';

import { Loading } from '../../../../components';

import type { IntegrationCardItem } from '../../screens/home';

import type { ExtendedIntegrationCategory } from '../../screens/home/category_facets';

import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';

import { PackageCard } from '../package_card';

interface ControlsColumnProps {
  controls: ReactNode;
  title: string | undefined;
}

export const ControlsColumn = ({ controls, title }: ControlsColumnProps) => {
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
    <EuiFlexGroup direction="column" gutterSize="none" className="kbnStickyMenu">
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

const VirtualizedRow: React.FC<any> = ({ children, style, onHeightChange }) => {
  const ref = useRef(null);

  useEffect(() => {
    onHeightChange(ref.current.clientHeight);
  }, []);

  return (
    <div style={style}>
      <div ref={ref}>
        <EuiFlexGrid gutterSize="l" columns={3}>
          {children}
        </EuiFlexGrid>
        <EuiSpacer size="m" />
      </div>
    </div>
  );
};

export const GridColumn = ({
  list,
  showMissingIntegrationMessage = false,
  showCardLabels = false,
  isLoading,
}: GridColumnProps) => {
  const itemsSizeRefs = useRef(new Map<number, number>());
  const listRef = useRef(React.createRef());

  if (isLoading) return <Loading />;

  if (!list.length) {
    return (
      <EuiFlexGrid gutterSize="l" columns={3}>
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
      </EuiFlexGrid>
    );
  }

  return (
    <EuiAutoSizer style={{ minHeight: '300px' }}>
      {({ height, width }: { height: number; width: number }) => (
        <List
          ref={listRef}
          layout="vertical"
          itemCount={Math.ceil(list.length / 3)}
          itemSize={(index) => {
            const test = itemsSizeRefs.current.get(index) ?? 600;

            return test;
          }}
          height={height}
          estimatedItemSize={600}
          width={width}
        >
          {({ index, style }) => {
            return (
              <VirtualizedRow
                style={style}
                onHeightChange={(size: number) => {
                  itemsSizeRefs.current.set(index, size);
                  listRef.current.resetAfterIndex(index);
                }}
              >
                {list.slice(index * 3, index * 3 + 3).map((item) => {
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
                })}
              </VirtualizedRow>
            );
          }}
        </List>
      )}
      {/* <EuiFlexGrid gutterSize="l" columns={3}></EuiFlexGrid> */}
      {/* <EuiFlexGrid gutterSize="l" columns={3}>
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
      </EuiFlexGrid> */}
    </EuiAutoSizer>
  );
};

interface MissingIntegrationContentProps {
  resetQuery: () => void;
  setSelectedCategory: (category: ExtendedIntegrationCategory) => void;
  setUrlandPushHistory: (params: IntegrationsURLParameters) => void;
}

export const MissingIntegrationContent = ({
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
