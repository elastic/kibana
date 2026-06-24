/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiLink,
  EuiHealth,
  EuiIcon,
  EuiNotificationBadge,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SerializedStyles } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { getSeverityColor } from '../../../../common/anomaly_detection';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

const legendButtonLabel = i18n.translate('xpack.apm.serviceMap.legendControl', {
  defaultMessage: 'Legend',
});

const ANOMALY_SCORE_LEVELS = [
  {
    score: undefined,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.noScore', {
      defaultMessage: 'No score',
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.LOW,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.low', {
      defaultMessage: '{min}-{max}: Low',
      values: { min: ML_ANOMALY_THRESHOLD.LOW, max: ML_ANOMALY_THRESHOLD.WARNING },
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.WARNING,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.warning', {
      defaultMessage: '{min}-{max}: Warning',
      values: { min: ML_ANOMALY_THRESHOLD.WARNING, max: ML_ANOMALY_THRESHOLD.MINOR },
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.MINOR,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.minor', {
      defaultMessage: '{min}-{max}: Minor',
      values: { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.MAJOR,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.major', {
      defaultMessage: '{min}-{max}: Major',
      values: { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.CRITICAL,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.critical', {
      defaultMessage: '{min}-100: Critical',
      values: { min: ML_ANOMALY_THRESHOLD.CRITICAL },
    }),
  },
] as const;

interface ServiceMapLegendProps {
  controlIconCss: SerializedStyles;
}

const useLegendStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    euiTheme,
    styles: {
      container: css`
        width: 200px;
      `,
      shapeIcon: css`
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${euiTheme.size.base};
        height: ${euiTheme.size.base};
      `,
      groupedContainer: css`
        position: relative;
        flex-shrink: 0;
      `,
      groupedBadge: css`
        position: absolute;
        top: calc(-1 * ${euiTheme.size.xxs});
        right: calc(-1 * ${euiTheme.size.xs});
        font-size: ${euiTheme.size.s};
        padding: 0;
        min-width: 0;
        width: calc(${euiTheme.size.m} - ${euiTheme.border.width.thin});
        height: calc(${euiTheme.size.m} - ${euiTheme.border.width.thin});
        line-height: calc(
          ${euiTheme.size.m} - ${euiTheme.size.xxs} - ${euiTheme.border.width.thin}
        );
        background: ${euiTheme.colors.backgroundBasePlain};
        color: ${euiTheme.colors.textParagraph};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.textSubdued};
      `,
      connectionIcon: css`
        flex-shrink: 0;
        display: flex;
        align-items: center;
      `,
      bidirectionalIcons: css`
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 0;
      `,
      docsLink: css`
        font-size: ${euiTheme.size.m};
      `,
    },
  };
};

export function ServiceMapLegend({ controlIconCss }: ServiceMapLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme, styles } = useLegendStyles();
  const legendTitleId = useGeneratedHtmlId({ prefix: 'serviceMapLegendTitle' });
  const { docLinks } = useApmPluginContext().core;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <EuiPopover
      button={
        <EuiToolTip content={legendButtonLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            display="empty"
            color="text"
            size="s"
            iconType="question"
            onClick={toggle}
            aria-label={legendButtonLabel}
            data-test-subj="serviceMapLegendButton"
            css={controlIconCss}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="rightUp"
      panelPaddingSize="m"
      aria-labelledby={legendTitleId}
      data-test-subj="serviceMapLegendPopover"
    >
      <div css={styles.container}>
        <EuiTitle size="xxxs" id={legendTitleId}>
          <h3>
            {i18n.translate('xpack.apm.serviceMap.legend.nodeShapesTitle', {
              defaultMessage: 'Node shapes',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                {/* TODO: Use new EuiIcon component when available, details in https://github.com/elastic/kibana/issues/270399 */}
                <div css={styles.shapeIcon} aria-hidden={true}>
                  <svg viewBox="0 0 12 12" fill="none">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M11.25 6C11.25 8.8995 8.8995 11.25 6 11.25C3.10051 11.25 0.75 8.8995 0.75 6C0.75 3.10051 3.10051 0.75 6 0.75C8.8995 0.75 11.25 3.10051 11.25 6ZM10.5 6C10.5 8.48528 8.48528 10.5 6 10.5C3.51472 10.5 1.5 8.48528 1.5 6C1.5 3.51472 3.51472 1.5 6 1.5C8.48528 1.5 10.5 3.51472 10.5 6Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  {i18n.translate('xpack.apm.serviceMap.legend.circleDescription', {
                    defaultMessage: 'Circle: Instrumented services',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                {/* TODO: Use new EuiIcon component when available, details in https://github.com/elastic/kibana/issues/270399 */}
                <div css={styles.shapeIcon} aria-hidden={true}>
                  <svg viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 1C6.33435 1 6.64657 1.11937 6.83203 1.31808L10.832 5.60379C11.056 5.84372 11.056 6.15628 10.832 6.39621L6.83203 10.6819C6.64657 10.8806 6.33435 11 6 11C5.66565 11 5.35343 10.8806 5.16797 10.6819L1.16795 6.39621C0.944017 6.15628 0.944017 5.84372 1.16795 5.60379L5.16797 1.31808L5.24316 1.24763C5.43175 1.09155 5.70732 1 6 1ZM1.99998 6L6 10.2857L10 6L6 1.71429L1.99998 6Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  {i18n.translate('xpack.apm.serviceMap.legend.diamondDescription', {
                    defaultMessage: 'Diamond: Databases, external, and messaging',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <div css={styles.groupedContainer}>
                  {/* TODO: Use new EuiIcon component when available, details in https://github.com/elastic/kibana/issues/270399 */}
                  <div css={styles.shapeIcon} aria-hidden={true}>
                    <svg viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1C6.33435 1 6.64657 1.11937 6.83203 1.31808L10.832 5.60379C11.056 5.84372 11.056 6.15628 10.832 6.39621L6.83203 10.6819C6.64657 10.8806 6.33435 11 6 11C5.66565 11 5.35343 10.8806 5.16797 10.6819L1.16795 6.39621C0.944017 6.15628 0.944017 5.84372 1.16795 5.60379L5.16797 1.31808L5.24316 1.24763C5.43175 1.09155 5.70732 1 6 1ZM1.99998 6L6 10.2857L10 6L6 1.71429L1.99998 6Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <EuiNotificationBadge css={styles.groupedBadge} aria-hidden={true}>
                    n
                  </EuiNotificationBadge>
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  {i18n.translate('xpack.apm.serviceMap.legend.groupedResourcesNode', {
                    defaultMessage: 'Grouped resources',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <EuiTitle size="xxxs">
          <h3>
            {i18n.translate('xpack.apm.serviceMap.legend.connectionsTitle', {
              defaultMessage: 'Connections',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <div css={styles.connectionIcon}>
                  <EuiIcon type="sortRight" size="m" color="subdued" aria-hidden={true} />
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  {i18n.translate('xpack.apm.serviceMap.legend.requestFlowLine', {
                    defaultMessage: 'One-way request',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <div css={styles.bidirectionalIcons}>
                  <EuiIcon
                    type="sortable"
                    size="m"
                    color="subdued"
                    style={{ transform: 'rotate(90deg)' }}
                    aria-hidden={true}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  {i18n.translate('xpack.apm.serviceMap.legend.bidirectionalLine', {
                    defaultMessage: 'Two-way request',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <EuiTitle size="xxxs">
          <h3>
            {i18n.translate('xpack.apm.serviceMap.legend.anomalyScoreTitle', {
              defaultMessage: 'Anomaly score',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          {ANOMALY_SCORE_LEVELS.map(({ score, label }) => (
            <EuiFlexItem key={label}>
              <EuiHealth
                color={
                  score === undefined
                    ? euiTheme.colors.textSubdued
                    : getSeverityColor(score, euiTheme)
                }
              >
                <EuiText size="xs">{label}</EuiText>
              </EuiHealth>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiLink
          href={docLinks.links.apm.supportedServiceMapsLegend}
          target="_blank"
          external
          data-test-subj="serviceMapLegendDocsLink"
          css={styles.docsLink}
        >
          {i18n.translate('xpack.apm.serviceMap.legend.viewDocumentation', {
            defaultMessage: 'View documentation',
          })}
        </EuiLink>
      </div>
    </EuiPopover>
  );
}
