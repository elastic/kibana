/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { act } from '@testing-library/react';

import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { StepAboutRule } from '.';
import { useFetchIndex } from '../../../../common/containers/source';
import { useGetInstalledJob } from '../../../../common/components/ml/hooks/use_get_jobs';
import { mockAboutStepRule } from '../../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import { StepRuleDescription } from '../description_step';
import { stepAboutDefaultValue } from './default_value';
import type {
  AboutStepRule,
  RuleStepsFormHooks,
  RuleStep,
  DefineStepRule,
} from '../../../pages/detection_engine/rules/types';
import { DataSourceType } from '../../../pages/detection_engine/rules/types';
import { fillEmptySeverityMappings } from '../../../pages/detection_engine/rules/helpers';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/source');
jest.mock('../../../../common/components/ml/hooks/use_get_jobs');
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EuiFieldText: (props: any) => {
      const { isInvalid, isLoading, fullWidth, inputRef, isDisabled, ...validInputProps } = props;
      return <input {...validInputProps} />;
    },
  };
});

export const stepDefineStepMLRule: DefineStepRule = {
  ruleType: 'machine_learning',
  index: [],
  queryBar: { query: { query: '', language: '' }, filters: [], saved_id: null },
  machineLearningJobId: ['auth_high_count_logon_events_for_a_source_ip'],
  anomalyThreshold: 50,
  threshold: { cardinality: { value: '', field: [] }, value: '100', field: [] },
  threatIndex: [],
  threatQueryBar: { query: { query: '', language: '' }, filters: [], saved_id: null },
  requiredFields: [],
  relatedIntegrations: [],
  threatMapping: [],
  timeline: { id: null, title: null },
  eqlOptions: {},
  dataSourceType: DataSourceType.IndexPatterns,
  newTermsFields: ['host.ip'],
  historyWindowSize: '7d',
  shouldLoadQueryDynamically: false,
};

describe('StepAboutRuleComponent', () => {
  let useGetInstalledJobMock: jest.Mock;
  let formHook: RuleStepsFormHooks[RuleStep.aboutRule] | null = null;
  const setFormHook = <K extends keyof RuleStepsFormHooks>(
    step: K,
    hook: RuleStepsFormHooks[K]
  ) => {
    formHook = hook as typeof formHook;
  };

  beforeEach(() => {
    formHook = null;
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);
    useGetInstalledJobMock = (useGetInstalledJob as jest.Mock).mockImplementation(() => ({
      jobs: [],
    }));
  });

  it('it renders StepRuleDescription if isReadOnlyView is true and "name" property exists', () => {
    const wrapper = shallow(
      <StepAboutRule
        addPadding={false}
        defaultValues={mockAboutStepRule()}
        descriptionColumns="multi"
        isReadOnlyView={true}
        isLoading={false}
      />
    );

    expect(wrapper.find(StepRuleDescription).exists()).toBeTruthy();
  });

  it('is invalid if description is not present', async () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
        .first()
        .simulate('change', { target: { value: 'Test name text' } });

      const result = await formHook();
      expect(result?.isValid).toEqual(false);
    });
  });

  it('is invalid if threat match rule and threat_indicator_path is not present', async () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        defineRuleData={{ ruleType: 'threat_match' } as DefineStepRule}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutThreatIndicatorPath"] input')
        .first()
        .simulate('change', { target: { value: '' } });

      const result = await formHook();
      expect(result?.isValid).toEqual(false);
    });
  });

  it('is valid if is not a threat match rule and threat_indicator_path is not present', async () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });
    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }

      const result = await formHook();
      expect(result?.isValid).toEqual(true);
    });
  });

  it('is invalid if no "name" is present', async () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }

      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
        .first()
        .simulate('change', { target: { value: 'Test description text' } });
      const result = await formHook();
      expect(result?.isValid).toEqual(false);
    });
  });

  it('is valid if both "name" and "description" are present', async () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });
    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    const expected: AboutStepRule = {
      author: [],
      isAssociatedToEndpointList: false,
      isBuildingBlock: false,
      license: '',
      ruleNameOverride: '',
      timestampOverride: '',
      description: 'Test description text',
      falsePositives: [''],
      name: 'Test name text',
      note: '',
      references: [''],
      riskScore: { value: 21, mapping: [], isMappingChecked: false },
      severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
      tags: [],
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'none', name: 'none', reference: 'none' },
          technique: [],
        },
      ],
    };

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      const result = await formHook();
      expect(result?.isValid).toEqual(true);
      expect(result?.data).toEqual(expected);
    });
  });

  it('it allows user to set the risk score as a number (and not a string)', async () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleRiskScore-defaultRisk"] input')
      .first()
      .simulate('change', { target: { value: '80' } });

    const expected: AboutStepRule = {
      author: [],
      isAssociatedToEndpointList: false,
      isBuildingBlock: false,
      license: '',
      ruleNameOverride: '',
      timestampOverride: '',
      description: 'Test description text',
      falsePositives: [''],
      name: 'Test name text',
      note: '',
      references: [''],
      riskScore: { value: 80, mapping: [], isMappingChecked: false },
      severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
      tags: [],
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'none', name: 'none', reference: 'none' },
          technique: [],
        },
      ],
    };

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      const result = await formHook();
      expect(result?.isValid).toEqual(true);
      expect(result?.data).toEqual(expected);
    });
  });

  it('does not modify the provided risk score until the user changes the severity', async () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      const result = await formHook();
      expect(result?.isValid).toEqual(true);
      expect(result?.data?.riskScore.value).toEqual(21);

      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleSeverity"] [data-test-subj="select"]')
        .last()
        .simulate('click');
      wrapper.find('button#medium').simulate('click');

      const result2 = await formHook();
      expect(result2?.isValid).toEqual(true);
      expect(result2?.data?.riskScore.value).toEqual(47);
    });
  });

  it('should use index based on ML jobs when editing ML rule', async () => {
    (useFetchIndex as jest.Mock).mockClear();
    useGetInstalledJobMock.mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual(['auth_high_count_logon_events_for_a_source_ip']);
      return { jobs: [{ results_index_name: 'shared' }] };
    });

    mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        defineRuleData={stepDefineStepMLRule}
        descriptionColumns="multi"
        isReadOnlyView={false}
        setForm={setFormHook}
        isLoading={false}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    const indexNames = ['.ml-anomalies-shared'];
    expect(useFetchIndex).lastCalledWith(indexNames);
  });
});
