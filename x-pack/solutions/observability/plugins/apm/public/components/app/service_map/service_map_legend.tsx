/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { getSeverityColor } from '../../../../common/anomaly_detection';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

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
      defaultMessage: '0-3: Low',
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.WARNING,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.warning', {
      defaultMessage: '3-25: Warning',
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.MINOR,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.minor', {
      defaultMessage: '25-50: Minor',
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.MAJOR,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.major', {
      defaultMessage: '50-75: Major',
    }),
  },
  {
    score: ML_ANOMALY_THRESHOLD.CRITICAL,
    label: i18n.translate('xpack.apm.serviceMap.legend.anomalyScore.critical', {
      defaultMessage: '75-100: Critical',
    }),
  },
] as const;

interface ServiceMapLegendProps {
  controlIconCss: ReturnType<typeof css>;
}

export function ServiceMapLegend({ controlIconCss }: ServiceMapLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const legendTitleId = useGeneratedHtmlId({ prefix: 'serviceMapLegendTitle' });
  const { docLinks } = useApmPluginContext().core;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  const legendButtonLabel = i18n.translate('xpack.apm.serviceMap.legendControl', {
    defaultMessage: 'Legend',
  });

  const styles = useMemo(
    () => ({
      container: css`
        width: 200px;
      `,
      circle: css`
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid ${euiTheme.colors.textSubdued};
        background: ${euiTheme.colors.backgroundBasePlain};
        flex-shrink: 0;
      `,
      diamond: css`
        width: 12px;
        height: 12px;
        transform: rotate(45deg);
        border: 2px solid ${euiTheme.colors.textSubdued};
        background: ${euiTheme.colors.backgroundBasePlain};
        flex-shrink: 0;
        margin: 2px;
      `,
      groupedContainer: css`
        position: relative;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      `,
      groupedDiamond: css`
        width: 12px;
        height: 12px;
        transform: rotate(45deg);
        border: 2px solid ${euiTheme.colors.textSubdued};
        background: ${euiTheme.colors.backgroundBasePlain};
        position: absolute;
        top: 2px;
        left: 2px;
      `,
      groupedBadge: css`
        position: absolute;
        top: -3px;
        right: -3px;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: 1px solid ${euiTheme.colors.textSubdued};
        font-size: 7px;
        line-height: 9px;
        text-align: center;
        font-weight: bold;
        color: ${euiTheme.colors.textParagraph};
      `,
      connectionLine: css`
        width: 32px;
        height: 16px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
      `,
      docsLink: css`
        font-size: ${euiTheme.size.m};
      `,
    }),
    [euiTheme]
  );

  const edgeColor = euiTheme.colors.textSubdued;

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          display="empty"
          color="text"
          size="s"
          iconType="question"
          onClick={toggle}
          title={legendButtonLabel}
          aria-label={legendButtonLabel}
          data-test-subj="serviceMapLegendButton"
          css={controlIconCss}
        />
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
                <div css={styles.circle} />
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
                <div css={styles.diamond} />
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
                  <div css={styles.groupedDiamond} />
                  <div css={styles.groupedBadge}>n</div>
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
                <div css={styles.connectionLine}>
                  <svg width="32" height="12" viewBox="0 0 32 12" aria-hidden="true">
                    <line x1="0" y1="6" x2="24" y2="6" stroke={edgeColor} strokeWidth="1.5" />
                    <polygon points="24,2 32,6 24,10" fill={edgeColor} />
                  </svg>
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
                <div css={styles.connectionLine}>
                  <svg width="32" height="12" viewBox="0 0 32 12" aria-hidden="true">
                    <polygon points="0,6 8,2 8,10" fill={edgeColor} />
                    <line x1="8" y1="6" x2="24" y2="6" stroke={edgeColor} strokeWidth="1.5" />
                    <polygon points="24,2 32,6 24,10" fill={edgeColor} />
                  </svg>
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
                color={score === undefined ? euiTheme.colors.textSubdued : getSeverityColor(score)}
              >
                <EuiText size="xs">{label}</EuiText>
              </EuiHealth>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiLink
          href={docLinks.links.apm.supportedServiceMaps}
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
