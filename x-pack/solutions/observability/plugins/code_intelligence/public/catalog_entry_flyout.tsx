/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import type { CatalogItem } from './api';
import { SignalTypeBadge } from './signal_type_badge';

interface Props {
  item: CatalogItem;
  onClose: () => void;
}

const languagesByExtension: Record<string, string> = {
  go: 'go',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  java: 'java',
  rb: 'ruby',
  rs: 'rust',
  cs: 'csharp',
  php: 'php',
  kt: 'kotlin',
};

/** Picks the highlight language for an evidence excerpt from its file extension. */
export const evidenceLanguage = (path?: string): string => {
  const extension = path?.match(/\.([^./]+)$/)?.[1]?.toLowerCase();
  return (extension !== undefined && languagesByExtension[extension]) || 'text';
};

const validationColors: Record<string, string> = {
  valid: 'success',
  invalid: 'danger',
};

const copyRevisionLabel = i18n.translate('xpack.codeIntelligence.catalogEntry.copyRevision', {
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

export const CatalogEntryFlyout = ({ item, onClose }: Props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'codeIntelligenceCatalogEntryTitle' });
  const evidence = item.evidence ?? [];
  const diagnostics = item.validation?.diagnostics ?? [];

  const details: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.codeIntelligence.catalogEntry.repository', {
        defaultMessage: 'Repository',
      }),
      description: item.repository ?? '—',
    },
    {
      title: i18n.translate('xpack.codeIntelligence.catalogEntry.revision', {
        defaultMessage: 'Revision',
      }),
      description:
        item.revision === undefined ? (
          '—'
        ) : (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiCode data-test-subj="codeIntelligenceCatalogEntryRevision">
                {item.revision}
              </EuiCode>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={item.revision}>
                {(copy) => (
                  <EuiToolTip content={copyRevisionLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      data-test-subj="codeIntelligenceCatalogEntryCopyRevision"
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
    {
      title: i18n.translate('xpack.codeIntelligence.catalogEntry.validation', {
        defaultMessage: 'Validation status',
      }),
      description:
        item.validation?.status === undefined ? (
          '—'
        ) : (
          <>
            <EuiBadge
              color={validationColors[item.validation.status] ?? 'hollow'}
              data-test-subj="codeIntelligenceCatalogEntryValidation"
            >
              {item.validation.status}
            </EuiBadge>
            {diagnostics.length > 0 && (
              <EuiText size="xs" color="subdued">
                <ul>
                  {diagnostics.map((diagnostic, index) => (
                    <li key={index}>{diagnostic}</li>
                  ))}
                </ul>
              </EuiText>
            )}
          </>
        ),
    },
    ...(item.severity_score === undefined
      ? []
      : [
          {
            title: i18n.translate('xpack.codeIntelligence.catalogEntry.severity', {
              defaultMessage: 'Severity score',
            }),
            description: String(item.severity_score),
          },
        ]),
    ...(item.updated_at === undefined
      ? []
      : [
          {
            title: i18n.translate('xpack.codeIntelligence.catalogEntry.updated', {
              defaultMessage: 'Updated',
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
      data-test-subj="codeIntelligenceCatalogEntryFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
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
        <EuiTitle size="m">
          <h2 id={titleId}>
            {item.title ??
              i18n.translate('xpack.codeIntelligence.catalogEntry.untitled', {
                defaultMessage: 'Untitled entry',
              })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {item.description !== undefined && item.description.trim() !== '' && (
          <>
            <EuiText size="s" data-test-subj="codeIntelligenceCatalogEntryDescription">
              <p>{item.description}</p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        )}

        <SectionTitle>
          {i18n.translate('xpack.codeIntelligence.catalogEntry.detailsTitle', {
            defaultMessage: 'Details',
          })}
        </SectionTitle>
        <EuiDescriptionList type="column" compressed listItems={details} />
        <EuiSpacer size="l" />

        <SectionTitle>
          {i18n.translate('xpack.codeIntelligence.catalogEntry.queryTitle', {
            defaultMessage: 'ES|QL query',
          })}
        </SectionTitle>
        <EuiCodeBlock
          language="esql"
          isCopyable
          paddingSize="s"
          data-test-subj="codeIntelligenceCatalogEntryQuery"
        >
          {item.query ?? ''}
        </EuiCodeBlock>
        <EuiSpacer size="l" />

        <SectionTitle>
          {i18n.translate('xpack.codeIntelligence.catalogEntry.evidenceTitle', {
            defaultMessage: 'Evidence ({count})',
            values: { count: evidence.length },
          })}
        </SectionTitle>
        {evidence.length === 0 ? (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.codeIntelligence.catalogEntry.noEvidence', {
                defaultMessage: 'This entry has no evidence.',
              })}
            </p>
          </EuiText>
        ) : (
          evidence.map(({ path, line, excerpt }, index) => (
            <div key={index} data-test-subj="codeIntelligenceCatalogEntryEvidence">
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
          buttonContent={i18n.translate('xpack.codeIntelligence.catalogEntry.rawJson', {
            defaultMessage: 'Raw JSON',
          })}
          data-test-subj="codeIntelligenceCatalogEntryRawJson"
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
