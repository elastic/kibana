/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSkeletonText, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { JourneyStep, SyntheticsJourneyApiResponse } from '../../../../../common/runtime_types';

type TabId = 'code' | 'console' | 'stackTrace';

export const StepTabs = ({
  stepsList,
  step,
  loading,
}: {
  stepsList?: SyntheticsJourneyApiResponse['steps'];
  step?: JourneyStep;
  loading: boolean;
}) => {
  let tabs: Array<{ id: TabId; name: string }> = [
    {
      id: 'code',
      name: CODE_EXECUTED,
    },
    {
      id: 'console',
      name: CONSOLE_LABEL,
    },
  ];

  const isFailedStep = step?.synthetics.step?.status === 'failed';

  if (isFailedStep) {
    tabs = [
      {
        id: 'stackTrace',
        name: STACKTRACE_LABEL,
      },
      ...tabs,
    ];
  }

  const [selectedTabId, setSelectedTabId] = useState<TabId>('code');

  useEffect(() => {
    if (isFailedStep) {
      setSelectedTabId('stackTrace');
    } else {
      setSelectedTabId('code');
    }
  }, [isFailedStep]);

  const getBrowserConsoles = useCallback(
    (index: number) => {
      return stepsList
        ?.filter(
          (stepF) =>
            stepF.synthetics?.type === 'journey/browserconsole' &&
            stepF.synthetics?.step?.index! === index
        )
        .map((stepF) => stepF.synthetics?.payload?.text!);
    },
    [stepsList]
  );

  if (!loading && stepsList?.length === 0) {
    return null;
  }

  const onSelectedTabChanged = (id: TabId) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  const renderTabContent = () => {
    if (loading) {
      return <EuiSkeletonText />;
    }
    switch (selectedTabId) {
      case 'code':
        return (
          <EuiCodeBlock isCopyable={true} overflowHeight="200px" language="javascript">
            {step?.synthetics?.payload?.source}
          </EuiCodeBlock>
        );
      case 'console':
        return (
          <EuiCodeBlock isCopyable={true} overflowHeight="200px" language="javascript">
            {getBrowserConsoles(1)?.join('\n')}
          </EuiCodeBlock>
        );
      case 'stackTrace':
        return (
          <EuiCodeBlock isCopyable={true} overflowHeight="200px" language="html">
            {step?.synthetics?.error?.stack}
          </EuiCodeBlock>
        );

      default:
        return (
          <EuiCodeBlock isCopyable={true} overflowHeight="200px" language="javascript">
            {step?.synthetics?.payload?.source}
          </EuiCodeBlock>
        );
    }
  };

  return (
    <>
      <EuiTabs size="s">{renderTabs()}</EuiTabs>
      {renderTabContent()}
    </>
  );
};

const CODE_EXECUTED = i18n.translate('xpack.synthetics.testDetails.codeExecuted', {
  defaultMessage: 'Code executed',
});

const STACKTRACE_LABEL = i18n.translate('xpack.synthetics.testDetails.stackTrace', {
  defaultMessage: 'Stacktrace',
});

const CONSOLE_LABEL = i18n.translate('xpack.synthetics.testDetails.console', {
  defaultMessage: 'Console',
});
