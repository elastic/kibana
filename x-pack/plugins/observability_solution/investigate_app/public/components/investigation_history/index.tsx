/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import classNames from 'classnames';
import { Investigation } from '@kbn/investigate-plugin/common';
import { useTheme } from '../../hooks/use_theme';
import { InvestigateTextButton } from '../investigate_text_button';

const headerClassName = css`
  text-transform: uppercase;
  font-weight: 600;
`;

const investigationItemClassName = css`
  max-width: 100%;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const newInvestigationItemClassName = css`
  .euiText {
    font-weight: 500 !important;
  }
`;

function WrapWithHeader({ children, loading }: { children: React.ReactElement; loading: boolean }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" className={headerClassName} color="subdued">
              {i18n.translate('xpack.investigateApp.investigationHistory.previously', {
                defaultMessage: 'Previously',
              })}
            </EuiText>
          </EuiFlexItem>
          {loading ? (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function InvestigationHistory({
  investigations,
  loading,
  error,
  onInvestigationClick,
  onStartNewInvestigationClick,
  onDeleteInvestigationClick,
}: {
  investigations?: Array<Pick<Investigation, 'id' | 'title'>>;
  loading: boolean;
  error?: Error;
  onInvestigationClick: (id: string) => void;
  onStartNewInvestigationClick: () => void;
  onDeleteInvestigationClick: (id: string) => void;
}) {
  const theme = useTheme();

  const investigationsList = (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem
        grow={false}
        className={classNames(investigationItemClassName, newInvestigationItemClassName)}
      >
        {}
        <EuiLink
          data-test-subj="investigateAppInvestigationHistoryLink"
          onClick={() => {
            onStartNewInvestigationClick();
          }}
        >
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="newChat" size="s" color={theme.colors.text} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color={theme.colors.text}>
                {i18n.translate('xpack.investigateApp.investigationHistory.new', {
                  defaultMessage: 'New investigation',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiFlexItem>
      {investigations?.length ? (
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
      ) : null}
      {investigations?.map((investigation) => (
        <EuiFlexItem key={investigation.id} grow={false} className={investigationItemClassName}>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem
              grow
              className={css`
                .deleteinvestigationbutton: {
                  visibility: hidden;
                }
                &:hover .deleteinvestigationbutton {
                  visibility: visible;
                }
              `}
            >
              <EuiLink
                data-test-subj="investigateAppInvestigationsListLink"
                onClick={() => {
                  onInvestigationClick(investigation.id);
                }}
              >
                <EuiText size="s" color={theme.colors.text}>
                  {investigation.title}
                </EuiText>
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InvestigateTextButton
                className="deleteinvestigationbutton"
                iconType="trash"
                onClick={() => {
                  onDeleteInvestigationClick(investigation.id);
                }}
                size="xs"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  if (error) {
    return (
      <WrapWithHeader loading={loading}>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="warning" color="danger" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="danger">
                  {error.message}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{investigationsList}</EuiFlexItem>
        </EuiFlexGroup>
      </WrapWithHeader>
    );
  }

  return <WrapWithHeader loading={loading}>{investigationsList}</WrapWithHeader>;
}
