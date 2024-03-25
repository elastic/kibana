/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiIcon,
  EuiPanel,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { useIntersectionRef } from '../../../hooks/use_intersection_ref';
import { nameColumnLabel } from '../constants';

interface IntegrationsListProps {
  items: unknown[];
}

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
      {!shouldDisplayPrompt && (
        <IntegrationListWrapper className="eui-yScroll" paddingSize="none" hasShadow={false}>
          <Header onSortByName={onSortByName} search={search} />
          {shouldDisplayPrompt && statusPrompt}
          {items.map((integration, pos) => {
            const isLastItem = pos === items.length - 1;

            return (
              <>
                {isLastItem && <span ref={spyRef} />}
                <IntegrationItem integration={integration} />
                {isLastItem ? null : rule}
              </>
            );
          })}
        </IntegrationListWrapper>
      )}
    </EuiPanel>
  );
}

function IntegrationItem({ integration }) {
  const { id, datasets, onClick } = integration;
  const accordionId = useGeneratedHtmlId({ prefix: 'integration', suffix: id });

  const integrationIcon = useMemo(
    () => (
      <PackageIcon
        packageName={integration.name}
        version={integration.version}
        size="m"
        icons={integration.icons}
        tryApi
      />
    ),
    [integration]
  );

  const integrationButton = (
    <IntegrationItemButton integration={integration} icon={integrationIcon} />
  );

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={integrationButton}
      buttonContentClassName="eui-fullWidth"
      data-test-subj={integration.id}
      {...(onClick && { onToggle: onClick })}
    >
      {rule}
      {datasets.map((dataset) => (
        <DatasetItem dataset={dataset} icon={integrationIcon} />
      ))}
    </EuiAccordion>
  );
}

function Header({ onSortByName, search, ...props }) {
  const handleNameSort = (sortOrder) => onSortByName({ ...search, sortOrder });

  return (
    <div css={headerStyle}>
      <ListRow withIndentation {...props}>
        <NameColumn component={Sortable} sortOrder={search.sortOrder} onSort={handleNameSort}>
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

function IntegrationItemButton({ integration, icon, ...props }) {
  return (
    <ListRow {...props}>
      <NameColumn>
        <TextWithIcon text={integration.title} icon={icon} />
      </NameColumn>
      <DatasetCountColumn>
        <EuiText size="xs" color="subdued">
          <span>{integration.datasets.length}</span>
        </EuiText>
      </DatasetCountColumn>
    </ListRow>
  );
}

function DatasetItem({ dataset, icon, ...props }) {
  return (
    <ListRow withIndentation css={datasetItemStyle} {...props}>
      <NameColumn
        component={ButtonWithIcon}
        text={dataset.title}
        icon={icon}
        onClick={dataset.onClick}
      />
    </ListRow>
  );
}

function ListRow(props) {
  return <StyledListRow gutterSize="s" alignItems="center" {...props} />;
}

function TextWithIcon({ icon, text, ...props }) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} {...props}>
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
      <EuiText size="s">{text}</EuiText>
    </EuiFlexGroup>
  );
}

function ButtonWithIcon({ icon, text, ...props }) {
  return (
    <button {...props}>
      <TextWithIcon icon={icon} text={text} />
    </button>
  );
}

function NameColumn(props) {
  return <ListColumn grow={3} {...props} />;
}

function DatasetCountColumn(props) {
  return <ListColumn grow={false} {...props} />;
}

// TODO: use this column to compose the integrations table using the right reserved space
// function LastActivityColumn(props) {
//   return <ListColumn grow={2} {...props} />;
// }

function Sortable({ children, sortOrder = 'asc', onSort, ...props }) {
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

const ListColumn = styled(EuiFlexItem)`
  padding: ${euiThemeVars.euiSizeS} 0;
`;

const IntegrationListWrapper = styled(EuiPanel)`
  max-height: 400px;
`;

const indentationStyle = css`
  padding-left: ${euiThemeVars.euiSizeL};
  margin-inline-start: ${euiThemeVars.euiSizeXS};
`;

const headerStyle = css`
  position: sticky;
  top: 0;
  background-color: ${euiThemeVars.euiColorEmptyShade};
  z-index: ${euiThemeVars.euiZHeader};
`;

const datasetItemStyle = css`
  border-top: 1px solid ${euiThemeVars.euiColorLightestShade};
`;

const StyledListRow = styled(EuiFlexGroup)`
  padding-right: ${euiThemeVars.euiSizeM};
  ${({ withIndentation = false }) => (withIndentation ? indentationStyle : '')}
`;
