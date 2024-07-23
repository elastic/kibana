/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm } from '../../types';
import { useKibana } from '../../hooks/use_kibana';
import { MANAGEMENT_API_KEYS } from '../../../common/routes';
import { LANGCHAIN_PYTHON } from './examples/py_langchain_python';
import { PY_LANG_CLIENT } from './examples/py_lang_client';

interface ViewCodeFlyoutProps {
  onClose: () => void;
}

export const ES_CLIENT_DETAILS = (cloud: CloudSetup | undefined) => {
  if (cloud) {
    return `
es_client = Elasticsearch(
    "${cloud.elasticsearchUrl}",
    api_key=os.environ["ES_API_KEY"]
)
      `;
  }

  return `
es_client = Elasticsearch(
    "<your-elasticsearch-url>"
)
  `;
};

export const ViewCodeFlyout: React.FC<ViewCodeFlyoutProps> = ({ onClose }) => {
  const usageTracker = useUsageTracker();
  const [selectedLanguage, setSelectedLanguage] = useState('py-es-client');
  const { getValues } = useFormContext<ChatForm>();
  const formValues = getValues();
  const {
    services: { cloud, http },
  } = useKibana();

  const CLIENT_STEP = ES_CLIENT_DETAILS(cloud);

  const steps: Record<string, React.ReactElement> = {
    'lc-py': LANGCHAIN_PYTHON(formValues, CLIENT_STEP),
    'py-es-client': PY_LANG_CLIENT(formValues, CLIENT_STEP),
  };
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value);
  };

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.viewCodeFlyoutOpened);
  }, [usageTracker]);

  useEffect(() => {
    usageTracker?.click(`${AnalyticsEvents.viewCodeLanguageChange}_${selectedLanguage}`);
  }, [usageTracker, selectedLanguage]);

  return (
    <EuiFlyout ownFocus onClose={onClose} data-test-subj="viewCodeFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.viewCode.flyout.title"
              defaultMessage="Application code"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.viewCode.flyout.subtitle"
              defaultMessage="Here's the code used to render this search experience. You can integrate it into your own application, modifying as needed."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiSelect
                  options={[
                    { value: 'py-es-client', text: 'Python Elasticsearch Client with OpenAI' },
                    { value: 'lc-py', text: 'LangChain Python with OpenAI' },
                  ]}
                  onChange={handleLanguageChange}
                  value={selectedLanguage}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="primary"
                  iconType="popout"
                  href={http.basePath.prepend(MANAGEMENT_API_KEYS)}
                  data-test-subj="viewCodeManageApiKeys"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.searchPlayground.viewCode.flyout.apiKeysAction"
                    defaultMessage="Manage API Keys"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{steps[selectedLanguage]}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
