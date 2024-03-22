/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiIcon,
  EuiPanel,
  EuiListGroup,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { useIntersectionRef } from '../../../hooks/use_intersection_ref';
import { INTEGRATIONS_PANEL_ID } from '../constants';

interface IntegrationsListProps {
  items: unknown[];
}

const rule = <EuiHorizontalRule margin="none" />;

export function IntegrationsList({
  children,
  items,
  statusPrompt,
  onScrollEnd,
  ...props
}: IntegrationsListProps) {
  const [spyRef] = useIntersectionRef({ onIntersecting: onScrollEnd });

  const shouldDisplayPrompt = Boolean(!items || items.length === 0);

  return (
    <EuiPanel
      {...props}
      id={INTEGRATIONS_PANEL_ID}
      data-test-subj="integrationsContextMenu"
      paddingSize="none"
      hasShadow={false}
    >
      {children}
      {/* TODO: get real numbers from api */}
      <Counter totalIntegrationsCount={items?.length ?? 0} totalDatasetsCount={50} />
      {rule}
      <Header />
      {rule}
      {shouldDisplayPrompt && statusPrompt}
      {!shouldDisplayPrompt && (
        <IntegrationListWrapper className="eui-yScroll" paddingSize="none" hasShadow={false}>
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
  const { id, datasets } = integration;
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
    <EuiAccordion id={accordionId} buttonContent={integrationButton}>
      {datasets.map((dataset) => (
        <>
          {rule}
          <DatasetItem dataset={dataset} icon={integrationIcon} />
        </>
      ))}
    </EuiAccordion>
  );
}

function Header(props) {
  return (
    <ListRow withIndentation {...props}>
      <NameColumn component={Sortable}>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.logsExplorer.headerListItem.nameTextLabel', {
              defaultMessage: 'Name',
            })}
          </strong>
        </EuiText>
      </NameColumn>
    </ListRow>
  );
}

function IntegrationItemButton({ integration, icon, ...props }) {
  return (
    <ListRow {...props}>
      <NameColumn>
        <TextWithIcon text={integration.title} icon={icon} />
      </NameColumn>
    </ListRow>
  );
}

function DatasetItem({ dataset, icon, ...props }) {
  return (
    <ListRow withIndentation {...props}>
      <NameColumn component={ButtonWithIcon} text={dataset.name} icon={icon} />
    </ListRow>
  );
}

function ListRow({ withIndentation = false, ...props }) {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      css={withIndentation ? indentationStyle : undefined}
      {...props}
    />
  );
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

// TODO: use this column to compose the integrations table using the right reserved space
// function LastActivityColumn(props) {
//   return <ListColumn grow={2} {...props} />;
// }

function Sortable({ children, isAscending = false, ...props }) {
  return (
    <button {...props}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={isAscending ? 'sortUp' : 'sortDown'} size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </button>
  );
}

function Counter({ totalDatasetsCount, totalIntegrationsCount }) {
  return (
    <EuiText size="xs" color="subdued" css={counterStyle}>
      <p>
        {i18n.translate('xpack.logsExplorer.dataSourceSelector.counter', {
          defaultMessage: '{totalIntegrationsCount} integrations, {totalDatasetsCount} datasets',
          values: {
            totalDatasetsCount,
            totalIntegrationsCount,
          },
        })}
      </p>
    </EuiText>
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

const counterStyle = css`
  padding-left: ${euiThemeVars.euiSizeS};
  margin-bottom: ${euiThemeVars.euiSizeS};
`;
