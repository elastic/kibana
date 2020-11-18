/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPageHeader, EuiPageHeaderSection, EuiTitle, EuiCallOut } from '@elastic/eui';
import { useValues } from 'kea';
import { i18n } from '@kbn/i18n';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { FlashMessages } from '../../../shared/flash_messages';
import { DOCUMENTS_TITLE } from './constants';
import { EngineLogic } from '../engine';

const MetaEngineCallout: React.FC = () => (
  <>
    <EuiCallOut
      iconType="iInCircle"
      title={i18n.translate('xpack.enterpriseSearch.appSearch.documents.metaEngineCallout.title', {
        defaultMessage: 'You are within a Meta Engine.',
      })}
    >
      <p>
        {i18n.translate('xpack.enterpriseSearch.appSearch.documents.metaEngineCallout', {
          defaultMessage:
            'Meta Engines have many Source Engines. Visit your Source Engines to alter their documents.',
        })}
      </p>
    </EuiCallOut>
  </>
);

interface Props {
  engineBreadcrumb: string[];
}

export const Documents: React.FC<Props> = ({ engineBreadcrumb }) => {
  const { isMetaEngine } = useValues(EngineLogic);

  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, DOCUMENTS_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{DOCUMENTS_TITLE}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <FlashMessages />
      {isMetaEngine && <MetaEngineCallout />}
    </>
  );
};
