/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import {
  EuiPageContent,
  EuiPageContentBody,
  EuiText,
  EuiPageHeader,
  EuiPageBody,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RouteComponentProps } from 'react-router-dom';
import { useAppContext } from '../../app_context';
import { LatestMinorBanner } from '../latest_minor_banner';
import { ESDeprecationStats } from './es_stats';

const i18nTexts = {
  pageTitle: i18n.translate('xpack.upgradeAssistant.pageTitle', {
    defaultMessage: 'Upgrade Assistant',
  }),
  pageDescription: (nextMajor: string) =>
    i18n.translate('xpack.upgradeAssistant.pageDescription', {
      defaultMessage:
        'This assistant helps you prepare your cluster and indices for Elasticsearch {nextMajor}. For other issues that need your attention, see the Elasticsearch logs.',
      values: {
        nextMajor,
      },
    }),
  docLink: i18n.translate('xpack.upgradeAssistant.documentationLinkText', {
    defaultMessage: 'Upgrade Assistant docs',
  }),
};

interface Props {
  history: RouteComponentProps['history'];
}

export const DeprecationsOverview: FunctionComponent<Props> = ({ history }) => {
  // TODO
  // const [telemetryState, setTelemetryState] = useState<TelemetryState>(TelemetryState.Complete);

  const { kibanaVersionInfo, breadcrumbs } = useAppContext();
  const { nextMajor } = kibanaVersionInfo;

  // useEffect(() => {
  //   if (isLoading === false) {
  //     setTelemetryState(TelemetryState.Running);

  //     async function sendTelemetryData() {
  //       await api.sendTelemetryData({
  //         overview: true,
  //       });
  //       setTelemetryState(TelemetryState.Complete);
  //     }

  //     sendTelemetryData();
  //   }
  // }, [api, isLoading]);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('overview');
  }, [breadcrumbs]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiPageHeader
          pageTitle={i18nTexts.pageTitle}
          rightSideItems={[
            <EuiButtonEmpty
              // TODO add doc link
              href={'#'}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              {i18nTexts.docLink}
            </EuiButtonEmpty>,
          ]}
        />

        <EuiPageContentBody>
          <>
            <EuiText data-test-subj="overviewDetail" grow={false}>
              <p>{i18nTexts.pageDescription(`${nextMajor}.x`)}</p>
            </EuiText>

            <EuiSpacer />

            {/* Remove this in last minor of the current major (e.g., 7.15) */}
            <LatestMinorBanner />

            <EuiSpacer size="xl" />

            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <ESDeprecationStats history={history} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
