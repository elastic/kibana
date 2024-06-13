/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTabs,
  EuiTab,
  useEuiTheme,
  useEuiMinBreakpoint,
  type EuiPageHeaderProps,
  EuiButton,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { EuiBadge } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
type Props = Pick<EuiPageHeaderProps, 'tabs' | 'title' | 'rightSideItems'>;

export const FlyoutHeader = ({ title, tabs = [], rightSideItems = [] }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibanaContextForPlugin();

  const [{ value: detections }, fetchDetections] = useAsyncFn(async () => {
    // This is a test
    return await services.http!.post('/api/observability/detections', {
      body: JSON.stringify({ hostName: title }),
    });
  }, []);

  useEffect(() => {
    fetchDetections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  console.log(detections);
  const detectionsByPackage =
    detections &&
    Object.fromEntries(detections.results?.map((d) => [d.detection.package, d.detection]));
  console.log(detectionsByPackage);

  return (
    <>
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" direction="row">
        <EuiFlexItem
          grow
          css={css`
            overflow: hidden;
            & h4 {
              text-overflow: ellipsis;
              overflow: hidden;
              white-space: nowrap;
              width: calc(100%);
            }
          `}
        >
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: flex-start;
            ${useEuiMinBreakpoint('m')} {
              align-items: flex-end;
            }
          `}
        >
          <EuiFlexGroup
            gutterSize="m"
            responsive={false}
            justifyContent="flexEnd"
            alignItems="center"
            css={css`
              margin-right: ${euiTheme.size.l};
            `}
          >
            {rightSideItems?.map((item, index) => (
              <EuiFlexItem key={index} grow={false}>
                {item}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {Object.keys(detectionsByPackage || {}).length > 0 && (
        <EuiFlexItem>
          <EuiCallOut
            iconType="iInCircle"
            title={i18n.translate(
              'xpack.infra.flyoutHeader.euiCallOut.additionalDataAvailableForLabel',
              { defaultMessage: 'Additional data available for collection on this host' }
            )}
          >
            {i18n.translate('xpack.infra.flyoutHeader.weFoundCallOutLabel', {
              defaultMessage: 'We found ',
            })}
            {Object.values(detectionsByPackage).reduce((s, d) => s + d.paths.length, 0)}{' '}
            {i18n.translate('xpack.infra.flyoutHeader.logFilesFromCallOutLabel', {
              defaultMessage: 'log files from',
            })}
            {Object.keys(detectionsByPackage).length}{' '}
            {i18n.translate('xpack.infra.flyoutHeader.packagesCallOutLabel', {
              defaultMessage: 'packages that are not collected yet',
            })}
            <br />
            <EuiButton
              data-test-subj="infraFlyoutHeaderClickHereToConfigureDataCollectionButton"
              size="s"
              onClick={() => {
                window.open(`/app/observabilityOnboarding/detections/?host=${title}`);
              }}
            >
              {i18n.translate('xpack.infra.flyoutHeader.clickHereToConfigureButtonLabel', {
                defaultMessage: 'Click here to configure data collection',
              })}
            </EuiButton>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiSpacer size="s" />
      <EuiTabs
        bottomBorder
        css={css`
          margin-bottom: calc(-1 * (${euiTheme.size.l} + 1px));
        `}
        size="s"
      >
        {tabs.map(({ label, ...tab }, index) => (
          <EuiTab key={index} {...tab}>
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
    </>
  );
};
