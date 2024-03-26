/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, Fragment, useMemo } from 'react';
import {
  EuiAccordion,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiIcon,
  EuiPanel,
  EuiFlexGroupProps,
  EuiPanelProps,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { css, SerializedStyles } from '@emotion/react';
import styled from '@emotion/styled';
import { Dataset, Integration } from '../../../../common/datasets';
import { useIntersectionRef } from '../../../hooks/use_intersection_ref';
import { nameColumnLabel } from '../constants';
import { tabContentHeight } from '../shared_styles';
import {
  DataSourceSelectorScrollHandler,
  DataSourceSelectorSearchHandler,
  DataSourceSelectorSearchParams,
} from '../types';

interface TDatasetItem extends Pick<Dataset, 'id' | 'iconType' | 'name' | 'title'> {
  onClick: () => void;
}

interface TIntegrationItem
  extends Pick<
    Integration,
    'id' | 'name' | 'title' | 'description' | 'icons' | 'status' | 'version'
  > {
  content?: React.ReactNode;
  isLoading?: boolean;
  datasets?: TDatasetItem[];
}

type IntegrationsListProps = {
  items: TIntegrationItem[];
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
  const [spyRef] = useIntersectionRef({ onIntersecting: onScrollEnd });

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
      <EuiPanel className="eui-yScroll" paddingSize="none" hasShadow={false} css={tabContentHeight}>
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
        <span ref={spyRef} /> {/* Used to trigger integrations infinite scroll loading */}
        {shouldDisplayPrompt && statusPrompt}
      </EuiPanel>
    </EuiPanel>
  );
}

interface IntegrationItemProps {
  integration: TIntegrationItem;
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

type HeaderProps = Pick<IntegrationsListProps, 'onSortByName' | 'search'> & ListRowProps;

function Header({ onSortByName, search, ...props }: HeaderProps) {
  const handleNameSort = (sortOrder: SortOrder) => onSortByName({ ...search, sortOrder });

  return (
    <div css={headerStyle}>
      <ListRow {...props} withIndentation>
        <NameColumn
          component={Sortable}
          // @ts-expect-error This is an issue with EuiFlexItem not correctly inferring the props of the passed component. https://github.com/elastic/eui/issues/7612
          sortOrder={search.sortOrder}
          onSort={handleNameSort}
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
      </ListRow>
      {rule}
    </div>
  );
}

interface IntegrationItemButtonProps extends ListRowProps {
  integration: TIntegrationItem;
  icon: React.ReactNode;
}

function IntegrationItemButton({ integration, icon, ...props }: IntegrationItemButtonProps) {
  const count = integration.datasets?.length ?? 0;

  return (
    <ListRow {...props}>
      <NameColumn>
        <TextWithIcon text={integration.title} icon={icon} />
      </NameColumn>
      <DatasetCountColumn>
        <EuiText size="xs" color="subdued">
          <span>{count}</span>
        </EuiText>
      </DatasetCountColumn>
    </ListRow>
  );
}

interface DatasetItemProps extends ListRowProps {
  dataset: TDatasetItem;
  icon: React.ReactNode;
}

function DatasetItem({ dataset, icon, ...props }: DatasetItemProps) {
  return (
    <ListRow {...props} withIndentation css={datasetItemStyle}>
      <NameColumn
        component={ButtonWithIcon}
        // @ts-expect-error This is an issue with EuiFlexItem not correctly inferring the props of the passed component. https://github.com/elastic/eui/issues/7612
        text={dataset.title}
        icon={icon}
        onClick={dataset.onClick}
      />
    </ListRow>
  );
}

interface ListRowProps extends EuiFlexGroupProps {
  css?: SerializedStyles;
  withIndentation?: boolean;
}

function ListRow({ css: customCss, withIndentation = false, ...props }: ListRowProps) {
  const styles = css`
    padding-right: ${euiThemeVars.euiSizeM};
    ${withIndentation ? indentationStyle : ''}
    ${customCss}
  `;

  return <EuiFlexGroup gutterSize="s" alignItems="center" css={styles} {...props} />;
}

interface TextWithIconProps extends EuiFlexGroupProps {
  icon: React.ReactNode;
  text: React.ReactNode;
}

function TextWithIcon({ icon, text, ...props }: TextWithIconProps) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} {...props}>
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
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

type ColumnProps = ComponentProps<typeof ListColumn>;

function NameColumn(props: ColumnProps) {
  return <ListColumn grow={3} {...props} />;
}

function DatasetCountColumn(props: ColumnProps) {
  return <ListColumn grow={false} {...props} />;
}

// TODO: use this column to compose the integrations table using the right reserved space
// function LastActivityColumn(props) {
//   return <ListColumn grow={2} {...props} />;
// }

type SortOrder = 'asc' | 'desc';
interface SortableProps extends React.HTMLAttributes<HTMLButtonElement> {
  sortOrder: SortOrder;
  onSort: (order: SortOrder) => void;
}

function Sortable({ children, sortOrder = 'asc', onSort, ...props }: SortableProps) {
  const isAscending = sortOrder === 'asc';

  const handleSort = () => {
    onSort(isAscending ? 'desc' : 'asc');
  };

  return (
    <button {...props} onClick={handleSort}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={isAscending ? 'sortUp' : 'sortDown'} size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </button>
  );
}

/**
 * Scoped styled
 */
const ListColumn = styled(EuiFlexItem)`
  padding: ${euiThemeVars.euiSizeS} 0;
`;

const indentationStyle = css`
  padding-left: ${euiThemeVars.euiSizeL};
  margin-inline-start: ${euiThemeVars.euiSizeXS};
`;

const rowMarginEnd = css`
  margin-inline-end: ${euiThemeVars.euiSizeXS};
`;

const headerStyle = css`
  position: sticky;
  top: 0;
  background-color: ${euiThemeVars.euiColorEmptyShade};
  z-index: ${euiThemeVars.euiZHeader};
  ${rowMarginEnd}
`;

const datasetItemStyle = css`
  border-top: 1px solid ${euiThemeVars.euiColorLightestShade};
`;
