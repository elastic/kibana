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
  EuiIcon,
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

export function ServiceMapLegend({ controlIconCss }: ServiceMapLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const legendTitleId = useGeneratedHtmlId({ prefix: 'serviceMapLegendTitle' });
  const { docLinks } = useApmPluginContext().core;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  const styles = useMemo(
    () => ({
      container: css`
        width: 200px;
      `,
      circle: css`
        width: ${euiTheme.size.base};
        height: ${euiTheme.size.base};
        border-radius: 50%;
        border: ${euiTheme.size.xxs} solid ${euiTheme.colors.textSubdued};
        background: ${euiTheme.colors.backgroundBasePlain};
        flex-shrink: 0;
      `,
      diamond: css`
        width: ${euiTheme.size.m};
        height: ${euiTheme.size.m};
        transform: rotate(45deg);
        border: ${euiTheme.size.xxs} solid ${euiTheme.colors.textSubdued};
        background: ${euiTheme.colors.backgroundBasePlain};
        flex-shrink: 0;
        margin: ${euiTheme.size.xxs};
      `,
      groupedContainer: css`
        position: relative;
        width: ${euiTheme.size.base};
        height: ${euiTheme.size.base};
        flex-shrink: 0;
      `,
      groupedDiamond: css`
        width: ${euiTheme.size.m};
        height: ${euiTheme.size.m};
        transform: rotate(45deg);
        border: ${euiTheme.size.xxs} solid ${euiTheme.colors.textSubdued};
        background: ${euiTheme.colors.backgroundBasePlain};
        position: absolute;
        top: ${euiTheme.size.xxs};
        left: ${euiTheme.size.xxs};
      `,
      groupedBadge: css`
        position: absolute;
        top: calc(-1 * ${euiTheme.size.xxs} - ${euiTheme.border.width.thin});
        right: calc(-1 * ${euiTheme.size.xxs} - ${euiTheme.border.width.thin});
        width: calc(${euiTheme.size.m} - ${euiTheme.border.width.thin});
        height: calc(${euiTheme.size.m} - ${euiTheme.border.width.thin});
        border-radius: 50%;
        background: ${euiTheme.colors.backgroundBasePlain};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.textSubdued};
        font-size: 7px;
        line-height: calc(
          ${euiTheme.size.m} - ${euiTheme.size.xxs} - ${euiTheme.border.width.thin}
        );
        text-align: center;
        font-weight: bold;
        color: ${euiTheme.colors.textParagraph};
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
    }),
    [euiTheme]
  );

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
