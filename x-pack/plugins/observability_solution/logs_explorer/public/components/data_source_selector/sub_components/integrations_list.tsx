/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import {
  EuiAccordion,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiText,
  EuiIcon,
  EuiPanel,
  EuiFlexGroupProps,
  EuiPanelProps,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { SpyRef } from '../../../utils/intersection_ref';
import { nameColumnLabel } from '../constants';
import {
  DataSourceSelectorScrollHandler,
  DataSourceSelectorSearchHandler,
  DataSourceSelectorSearchParams,
} from '../types';
import { DatasetTreeItem, IntegrationTreeItem } from '../utils';
import { SelectorColumnProps, SelectorList, SelectorRowProps, SortOrder } from './selector_list';

type IntegrationsListProps = {
  items: IntegrationTreeItem[];
  statusPrompt: React.ReactNode;
  onScrollEnd: DataSourceSelectorScrollHandler;
  onSortByName: DataSourceSelectorSearchHandler;
  search: DataSourceSelectorSearchParams;
} & EuiPanelProps;

const rule = <EuiHorizontalRule margin="none" />;

export function IntegrationsList({
  children,
  items,
  statusPrompt,
  onScrollEnd,
  onSortByName,
  search,
  ...props
}: IntegrationsListProps) {
  const shouldDisplayPrompt = Boolean(!items || items.length <= 1);

  return (
    <EuiPanel
      {...props}
      data-test-subj="dataSourceSelectorIntegrationsList"
      paddingSize="none"
      hasShadow={false}
    >
      {children}
      {rule}
      <SelectorList>
        <Header onSortByName={onSortByName} search={search} />
        {items.map((integration, pos) => {
          const isLastItem = pos === items.length - 1;

          return (
            <Fragment key={integration.id}>
              <IntegrationItem integration={integration} />
              {isLastItem ? null : rule}
            </Fragment>
          );
        })}
        {/* Used to trigger integrations infinite scroll loading */}
        <SpyRef onIntersecting={onScrollEnd} />
        {shouldDisplayPrompt && statusPrompt}
      </SelectorList>
    </EuiPanel>
  );
}

interface IntegrationItemProps {
  integration: IntegrationTreeItem;
}

function IntegrationItem({ integration }: IntegrationItemProps) {
  const { id, datasets, icons, name, version, isLoading } = integration;
  const accordionId = useGeneratedHtmlId({ prefix: 'integration', suffix: id });

  const integrationIcon = useMemo(
    () =>
      Boolean(name && version) ? (
        <PackageIcon packageName={name} version={version} size="m" icons={icons} tryApi />
      ) : (
        <EuiIcon type="package" />
      ),
    [name, version, icons]
  );

  const integrationButton = (
    <IntegrationItemButton integration={integration} icon={integrationIcon} />
  );

  const hasDatasets = Array.isArray(datasets) && datasets.length > 0;
  const content = hasDatasets
    ? datasets.map((dataset) => (
        <DatasetItem key={dataset.id} dataset={dataset} icon={integrationIcon} />
      ))
    : integration.content;

  return (
    <EuiAccordion
      id={accordionId}
      css={rowMarginEnd}
      buttonContent={integrationButton}
      buttonContentClassName="eui-fullWidth"
      data-test-subj={integration.id}
      isLoading={isLoading}
    >
      {rule}
      {content}
    </EuiAccordion>
  );
}

type HeaderProps = Pick<IntegrationsListProps, 'onSortByName' | 'search'> & SelectorRowProps;

function Header({ onSortByName, search, ...props }: HeaderProps) {
  const handleNameSort = (sortOrder: SortOrder) => onSortByName({ ...search, sortOrder });

  return (
    <SelectorList.Header {...props} withIndentation css={rowMarginEnd}>
      <NameColumn
        component={SelectorList.SortableColumn}
        // @ts-expect-error This is an issue with EuiFlexItem not correctly inferring the props of the passed component. https://github.com/elastic/eui/issues/7612
        sortOrder={search.sortOrder}
        onSort={handleNameSort}
        data-test-subj="dataSourceSelectorIntegrationNameHeader"
      >
        <EuiText size="xs">
          <strong>{nameColumnLabel}</strong>
        </EuiText>
      </NameColumn>
      <DatasetCountColumn>
        <EuiText size="xs" color="subdued">
          <span>#</span>
        </EuiText>
      </DatasetCountColumn>
    </SelectorList.Header>
  );
}

interface IntegrationItemButtonProps extends SelectorRowProps {
  integration: IntegrationTreeItem;
  icon: React.ReactNode;
}

function IntegrationItemButton({ integration, icon, ...props }: IntegrationItemButtonProps) {
  const count = integration.datasets?.length ?? 0;

  return (
    <SelectorList.Row {...props}>
      <NameColumn>
        <TextWithIcon text={integration.title} icon={icon} />
      </NameColumn>
      <DatasetCountColumn>
        <EuiText size="xs" color="subdued">
          <span>{count}</span>
        </EuiText>
      </DatasetCountColumn>
    </SelectorList.Row>
  );
}

interface DatasetItemProps extends SelectorRowProps {
  dataset: DatasetTreeItem;
  icon: React.ReactNode;
}

function DatasetItem({ dataset, icon, ...props }: DatasetItemProps) {
  return (
    <SelectorList.Row {...props} withIndentation data-test-subj={dataset.id}>
      <NameColumn
        component={ButtonWithIcon}
        // @ts-expect-error This is an issue with EuiFlexItem not correctly inferring the props of the passed component. https://github.com/elastic/eui/issues/7612
        text={dataset.title}
        icon={icon}
        onClick={dataset.onClick}
      />
    </SelectorList.Row>
  );
}

interface TextWithIconProps extends EuiFlexGroupProps {
  icon: React.ReactNode;
  text: React.ReactNode;
}

function TextWithIcon({ icon, text, ...props }: TextWithIconProps) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} {...props}>
      {icon}
      <EuiText size="s">{text}</EuiText>
    </EuiFlexGroup>
  );
}

interface ButtonWithIconProps
  extends React.HTMLAttributes<HTMLButtonElement>,
    Pick<TextWithIconProps, 'icon' | 'text'> {}

function ButtonWithIcon({ icon, text, ...props }: ButtonWithIconProps) {
  return (
    <button {...props}>
      <TextWithIcon icon={icon} text={text} />
    </button>
  );
}

function NameColumn(props: SelectorColumnProps) {
  return <SelectorList.Column sidePadding={0} grow={3} {...props} />;
}

function DatasetCountColumn(props: SelectorColumnProps) {
  return <SelectorList.Column sidePadding={0} grow={false} {...props} />;
}

// TODO: use this column to compose the integrations table using the right reserved space
// function LastActivityColumn(props) {
//   return <SelectorList.Column sidePadding={0} grow={2} {...props} />;
// }

/**
 * Scoped styled
 */
const rowMarginEnd = css`
  margin-inline-end: ${euiThemeVars.euiSizeXS};
`;
