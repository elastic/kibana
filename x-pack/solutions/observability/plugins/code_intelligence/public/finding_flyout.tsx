/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { InvestigateFindingButton } from './agent_builder/investigate_finding_context';
import type { FindingItem } from './api';
import { evidenceLanguage } from './catalog_entry_flyout';
import { FindingStatusBadge, FindingTypeBadge } from './finding_badges';
import { SignalTypeBadge } from './signal_type_badge';

interface Props {
  item: FindingItem;
  onClose: () => void;
}

const copyRevisionLabel = i18n.translate('xpack.codeIntelligence.finding.copyRevision', {
  defaultMessage: 'Copy revision',
});

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <>
    <EuiTitle size="xs">
      <h3>{children}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);

const yes = i18n.translate('xpack.codeIntelligence.finding.yes', { defaultMessage: 'Yes' });
const no = i18n.translate('xpack.codeIntelligence.finding.no', { defaultMessage: 'No' });

export const FindingFlyout = ({ item, onClose }: Props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'codeIntelligenceFindingTitle' });
  const evidence = item.evidence ?? [];
  const reviewNote =
    item.review_note === undefined || item.review_note === null || item.review_note.trim() === ''
      ? undefined
      : item.review_note;

  const details: Array<{ title: string; description: React.ReactNode }> = [
    {
      title: i18n.translate('xpack.codeIntelligence.finding.status', {
        defaultMessage: 'Status',
      }),
      description: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <FindingStatusBadge status={item.status} />
          </EuiFlexItem>
          {item.reviewed_at !== undefined && item.status !== 'open' && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.codeIntelligence.finding.reviewedAt', {
                  defaultMessage: 'Reviewed {date}',
                  values: { date: formatDate(item.reviewed_at) },
                })}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    ...(reviewNote === undefined
      ? []
      : [
          {
            title: i18n.translate('xpack.codeIntelligence.finding.reviewNote', {
              defaultMessage: 'Review note',
            }),
            description: (
              <EuiText size="s" data-test-subj="codeIntelligenceFindingReviewNote">
                {reviewNote}
              </EuiText>
            ),
          },
        ]),
    {
      title: i18n.translate('xpack.codeIntelligence.finding.repository', {
        defaultMessage: 'Repository',
      }),
      description: item.repository ?? '—',
    },
    {
      title: i18n.translate('xpack.codeIntelligence.finding.revision', {
        defaultMessage: 'Revision',
      }),
      description:
        item.revision === undefined ? (
          '—'
        ) : (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiCode data-test-subj="codeIntelligenceFindingRevision">{item.revision}</EuiCode>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={item.revision}>
                {(copy) => (
                  <EuiToolTip content={copyRevisionLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      data-test-subj="codeIntelligenceFindingCopyRevision"
                      iconType="copy"
                      size="xs"
                      aria-label={copyRevisionLabel}
                      onClick={copy}
                    />
                  </EuiToolTip>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
    },
    ...(item.log_level === undefined
      ? []
      : [
          {
            title: i18n.translate('xpack.codeIntelligence.finding.logLevel', {
              defaultMessage: 'Log level',
            }),
            description: <EuiCode>{item.log_level}</EuiCode>,
          },
        ]),
    {
      title: i18n.translate('xpack.codeIntelligence.finding.cataloged', {
        defaultMessage: 'In catalog',
      }),
      description: item.cataloged === true ? yes : no,
    },
    ...(item.created_at === undefined
      ? []
      : [
          {
            title: i18n.translate('xpack.codeIntelligence.finding.created', {
              defaultMessage: 'First seen',
            }),
            description: formatDate(item.created_at),
          },
        ]),
    ...(item.updated_at === undefined
      ? []
      : [
          {
            title: i18n.translate('xpack.codeIntelligence.finding.updated', {
              defaultMessage: 'Last extracted',
            }),
            description: formatDate(item.updated_at),
          },
        ]),
  ];

  return (
    <EuiFlyout
      ownFocus
      size="m"
      aria-labelledby={titleId}
      onClose={onClose}
      data-test-subj="codeIntelligenceFindingFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <FindingTypeBadge findingType={item.finding_type} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FindingStatusBadge status={item.status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SignalTypeBadge signalType={item.signal_type} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {item.repository}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={titleId}>
                {item.title ??
                  i18n.translate('xpack.codeIntelligence.finding.untitled', {
                    defaultMessage: 'Untitled finding',
                  })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InvestigateFindingButton finding={item} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {item.summary !== undefined && item.summary.trim() !== '' && (
          <>
            <EuiText size="s" data-test-subj="codeIntelligenceFindingSummary">
              <p>{item.summary}</p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        )}

        <SectionTitle>
          {i18n.translate('xpack.codeIntelligence.finding.detailsTitle', {
            defaultMessage: 'Details',
          })}
        </SectionTitle>
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          <EuiTable
            compressed
            tableLayout="fixed"
            responsiveBreakpoint={false}
            data-test-subj="codeIntelligenceFindingDetails"
            css={{
              'tbody tr:first-of-type > *': { borderTop: 'none' },
              'tbody tr:last-of-type > *': { borderBottom: 'none' },
            }}
          >
            <EuiTableBody>
              {details.map(({ title, description }) => (
                <EuiTableRow key={title}>
                  <EuiTableRowCell width="30%" textOnly={false} setScopeRow>
                    <EuiText size="s">
                      <strong>{title}</strong>
                    </EuiText>
                  </EuiTableRowCell>
                  <EuiTableRowCell textOnly={false}>{description}</EuiTableRowCell>
                </EuiTableRow>
              ))}
            </EuiTableBody>
          </EuiTable>
        </EuiPanel>
        <EuiSpacer size="l" />

        <SectionTitle>
          {i18n.translate('xpack.codeIntelligence.finding.evidenceTitle', {
            defaultMessage: 'Evidence ({count})',
            values: { count: evidence.length },
          })}
        </SectionTitle>
        {evidence.length === 0 ? (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.codeIntelligence.finding.noEvidence', {
                defaultMessage: 'This finding has no evidence.',
              })}
            </p>
          </EuiText>
        ) : (
          evidence.map(({ path, line, excerpt }, index) => (
            <div key={index} data-test-subj="codeIntelligenceFindingEvidence">
              {index > 0 && <EuiSpacer size="m" />}
              <EuiCode>
                {path === undefined ? '—' : line === undefined ? path : `${path}:${line}`}
              </EuiCode>
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                language={evidenceLanguage(path)}
                isCopyable
                paddingSize="s"
                overflowHeight={300}
                whiteSpace="pre"
                {...(line === undefined ? {} : { lineNumbers: { start: line } })}
              >
                {excerpt ?? ''}
              </EuiCodeBlock>
            </div>
          ))
        )}
        <EuiSpacer size="l" />

        <EuiAccordion
          id={`${titleId}-raw`}
          buttonContent={i18n.translate('xpack.codeIntelligence.finding.rawJson', {
            defaultMessage: 'Raw JSON',
          })}
          data-test-subj="codeIntelligenceFindingRawJson"
        >
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" isCopyable paddingSize="s" overflowHeight={600}>
            {JSON.stringify(item, null, 2)}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
