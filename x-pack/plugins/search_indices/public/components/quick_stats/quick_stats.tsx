/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAccordion,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

interface BaseQuickStatProps {
  icon: string;
  iconColor: string;
  title: string;
  secondaryTitle: string;
  open: boolean;
  stats: Array<{
    title: string;
    description: string;
  }>;
  setOpen: (open: boolean) => void;
  first?: boolean;
}

const QuickStat: React.FC<BaseQuickStatProps> = ({
  icon,
  title,
  stats,
  open,
  setOpen,
  first,
  secondaryTitle,
  iconColor,
}) => {
  const { euiTheme } = useEuiTheme();

  const id = useGeneratedHtmlId({
    prefix: 'formAccordion',
    suffix: title,
  });

  return (
    <EuiAccordion
      forceState={open ? 'open' : 'closed'}
      onToggle={() => setOpen(!open)}
      paddingSize="none"
      id={id}
      buttonElement="div"
      arrowDisplay="right"
      css={{
        borderLeft: euiTheme.border.thin,
        ...(first ? { borderLeftWidth: 0 } : {}),
        '.euiAccordion__arrow': {
          marginRight: euiTheme.size.s,
        },
        '.euiAccordion__triggerWrapper': {
          background: euiTheme.colors.ghost,
        },
        '.euiAccordion__children': {
          borderTop: euiTheme.border.thin,
          padding: euiTheme.size.m,
        },
      }}
      buttonContent={
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} color={iconColor} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h4>{title}</h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">{secondaryTitle}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      }
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList
            type="column"
            listItems={stats}
            columnWidths={[3, 1]}
            compressed
            descriptionProps={{
              color: 'subdued',
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

export const QuickStats: React.FC = () => {
  const [open, setOpen] = React.useState<boolean>(false);
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      paddingSize="none"
      hasShadow={false}
      css={() => ({
        border: euiTheme.border.thin,
        background: euiTheme.colors.lightestShade,
        overflow: 'hidden',
      })}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <QuickStat
            open={open}
            setOpen={setOpen}
            icon="documents"
            iconColor="black"
            title="Document count"
            secondaryTitle="42.8k"
            stats={[
              { title: 'Total', description: '42816' },
              { title: 'Index Size', description: '4.2TB' },
            ]}
            first
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <QuickStat
            open={open}
            setOpen={setOpen}
            icon="sparkles"
            iconColor="black"
            title="AI Search"
            secondaryTitle="1 Field"
            stats={[
              { title: 'Sparse', description: '0 Fields' },
              { title: 'Dense', description: '0 Fields' },
              { title: 'Semantic Text', description: '1 Field' },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
