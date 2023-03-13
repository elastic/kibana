/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiStepsHorizontal,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import {
  AddInferencePipelineFlyout,
  AddInferencePipelineContent,
  AddInferencePipelineHorizontalSteps,
  AddInferencePipelineFooter,
} from './add_inference_pipeline_flyout';
import { ConfigurePipeline } from './configure_pipeline';
import { EMPTY_PIPELINE_CONFIGURATION } from './ml_inference_logic';
import { NoModelsPanel } from './no_models';
import { ReviewPipeline } from './review_pipeline';
import { TestPipeline } from './test_pipeline';
import { AddInferencePipelineSteps } from './types';

const supportedMLModels: TrainedModelConfigResponse[] = [
  {
    inference_config: {
      ner: {},
    },
    input: {
      field_names: [],
    },
    model_id: 'test_model_id',
    model_type: 'pytorch',
    tags: ['test_tag'],
    version: '1',
  },
];
const DEFAULT_VALUES = {
  addInferencePipelineModal: {
    configuration: { ...EMPTY_PIPELINE_CONFIGURATION },
    indexName: 'unit-test-index',
    simulateBody: '',
    step: AddInferencePipelineSteps.Configuration,
  },
  createErrors: [],
  indexName: 'unit-test-index',
  isLoading: false,
  isPipelineDataValid: true,
  supportedMLModels,
};
const onClose = jest.fn();

describe('AddInferencePipelineFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
    setMockActions({
      setIndexName: jest.fn(),
    });
  });
  it('renders AddProcessorContent', () => {
    const wrapper = shallow(<AddInferencePipelineFlyout onClose={onClose} />);
    expect(wrapper.find(AddInferencePipelineContent)).toHaveLength(1);
  });
  describe('AddProcessorContent', () => {
    it('renders spinner when loading', () => {
      setMockValues({ ...DEFAULT_VALUES, isLoading: true });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);
    });
    it('renders no models panel when there are no models', () => {
      setMockValues({ ...DEFAULT_VALUES, supportedMLModels: [] });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(NoModelsPanel)).toHaveLength(1);
    });
    it('renders AddInferencePipelineHorizontalSteps', () => {
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(AddInferencePipelineHorizontalSteps)).toHaveLength(1);
    });
    it('renders ModalFooter', () => {
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(AddInferencePipelineFooter)).toHaveLength(1);
    });
    it('renders errors', () => {
      const errorMsg = 'oh no!';
      setMockValues({ ...DEFAULT_VALUES, createErrors: [errorMsg] });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);

      expect(wrapper.find(EuiCallOut)).toHaveLength(1);
      const errorCallout = wrapper.find(EuiCallOut);
      expect(errorCallout.prop('color')).toBe('danger');
      expect(errorCallout.prop('iconType')).toBe('alert');
      expect(errorCallout.find('p')).toHaveLength(1);
      expect(errorCallout.find('p').text()).toBe(errorMsg);
    });
    it('renders configure step', () => {
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(ConfigurePipeline)).toHaveLength(1);
    });
    it('renders test step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(TestPipeline)).toHaveLength(1);
    });
    it('renders review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(ReviewPipeline)).toHaveLength(1);
    });
  });
  describe('AddInferencePipelineHorizontalSteps', () => {
    const CONFIGURE_STEP_INDEX = 0;
    const TEST_STEP_INDEX = 1;
    const REVIEW_STEP_INDEX = 2;
    const setAddInferencePipelineStep = jest.fn();
    beforeEach(() => {
      setMockActions({
        setAddInferencePipelineStep,
      });
    });
    it('renders EuiStepsHorizontal', () => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      expect(wrapper.find(EuiStepsHorizontal)).toHaveLength(1);
    });
    it('configure step is complete with valid data', () => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const configureStep = steps.prop('steps')[CONFIGURE_STEP_INDEX];
      expect(configureStep.title).toBe('Configure');
      expect(configureStep.status).toBe('complete');
    });
    it('configure step is current with invalid data', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        isPipelineDataValid: false,
      });
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const configureStep = steps.prop('steps')[CONFIGURE_STEP_INDEX];
      expect(configureStep.title).toBe('Configure');
      expect(configureStep.status).toBe('current');
    });
    it('test step is current when on step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const testStep = steps.prop('steps')[TEST_STEP_INDEX];
      expect(testStep.title).toBe('Test');
      expect(testStep.status).toBe('current');
    });
    it('review step is current when on step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const reviewStep = steps.prop('steps')[REVIEW_STEP_INDEX];
      expect(reviewStep.title).toBe('Review');
      expect(reviewStep.status).toBe('current');
    });
    it('clicking configure step updates step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const configStep = steps.prop('steps')[CONFIGURE_STEP_INDEX];
      configStep.onClick({} as any);
      expect(setAddInferencePipelineStep).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Configuration
      );
    });
    it('clicking test step updates step', () => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const testStep = steps.prop('steps')[TEST_STEP_INDEX];
      testStep.onClick({} as any);
      expect(setAddInferencePipelineStep).toHaveBeenCalledWith(AddInferencePipelineSteps.Test);
    });
    it('clicking review step updates step', () => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const reviewStep = steps.prop('steps')[REVIEW_STEP_INDEX];
      reviewStep.onClick({} as any);
      expect(setAddInferencePipelineStep).toHaveBeenCalledWith(AddInferencePipelineSteps.Review);
    });
    it('cannot click test step when data is invalid', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        isPipelineDataValid: false,
      });
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const testStep = steps.prop('steps')[TEST_STEP_INDEX];
      testStep.onClick({} as any);
      expect(setAddInferencePipelineStep).not.toHaveBeenCalled();
    });
    it('cannot click review step when data is invalid', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        isPipelineDataValid: false,
      });
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const reviewStep = steps.prop('steps')[REVIEW_STEP_INDEX];
      reviewStep.onClick({} as any);
      expect(setAddInferencePipelineStep).not.toHaveBeenCalled();
    });
  });
  describe('ModalFooter', () => {
    const ingestionMethod = 'crawler';
    const actions = {
      attachPipeline: jest.fn(),
      createPipeline: jest.fn(),
      setAddInferencePipelineStep: jest.fn(),
    };
    beforeEach(() => {
      setMockActions(actions);
    });
    it('renders cancel button on config step', () => {
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const cancelBtn = wrapper.find(EuiButtonEmpty);
      expect(cancelBtn).toHaveLength(1);
      expect(cancelBtn.prop('children')).toBe('Cancel');
      cancelBtn.prop('onClick')!({} as any);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('renders cancel button on test step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const cancelBtn = wrapper.find(EuiButtonEmpty).at(1);
      expect(cancelBtn.prop('children')).toBe('Cancel');
      cancelBtn.prop('onClick')!({} as any);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('renders cancel button on review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Review,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const cancelBtn = wrapper.find(EuiButtonEmpty).at(1);
      expect(cancelBtn.prop('children')).toBe('Cancel');
      cancelBtn.prop('onClick')!({} as any);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('renders back button on test step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const backBtn = wrapper.find(EuiButtonEmpty).at(0);
      expect(backBtn.prop('children')).toBe('Back');
      backBtn.prop('onClick')!({} as any);
      expect(actions.setAddInferencePipelineStep).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Configuration
      );
    });
    it('renders back button on review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Review,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const backBtn = wrapper.find(EuiButtonEmpty).at(0);
      expect(backBtn.prop('children')).toBe('Back');
      backBtn.prop('onClick')!({} as any);
      expect(actions.setAddInferencePipelineStep).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Test
      );
    });
    it('renders enabled Continue with valid data', () => {
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const contBtn = wrapper.find(EuiButton);
      expect(contBtn).toHaveLength(1);
      expect(contBtn.prop('children')).toBe('Continue');
      expect(contBtn.prop('disabled')).toBe(false);
      contBtn.prop('onClick')!({} as any);
      expect(actions.setAddInferencePipelineStep).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Test
      );
    });
    it('renders disabled Continue with invalid data', () => {
      setMockValues({ ...DEFAULT_VALUES, isPipelineDataValid: false });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButton)).toHaveLength(1);
      expect(wrapper.find(EuiButton).prop('children')).toBe('Continue');
      expect(wrapper.find(EuiButton).prop('disabled')).toBe(true);
    });
    it('renders Continue button on test step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const contBtn = wrapper.find(EuiButton);
      expect(contBtn).toHaveLength(1);
      expect(contBtn.prop('children')).toBe('Continue');
      expect(contBtn.prop('disabled')).toBe(false);
      contBtn.prop('onClick')!({} as any);
      expect(actions.setAddInferencePipelineStep).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Review
      );
    });
    it('renders create button on review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Review,
          configuration: {
            destinationField: 'test',
            existingPipeline: false,
            modelID: 'test-model',
            pipelineName: 'my-test-pipeline',
            sourceField: 'body',
          },
        },
      });

      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const actionButton = wrapper.find(EuiButton);
      expect(actionButton).toHaveLength(1);
      expect(actionButton.prop('children')).toBe('Create pipeline');
      expect(actionButton.prop('color')).toBe('success');
      actionButton.prop('onClick')!({} as any);
      expect(actions.createPipeline).toHaveBeenCalledTimes(1);
    });
    it('renders attach button on review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Review,
          configuration: {
            destinationField: 'test',
            existingPipeline: true,
            modelID: 'test-model',
            pipelineName: 'my-test-pipeline',
            sourceField: 'body',
          },
        },
      });

      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const actionButton = wrapper.find(EuiButton);
      expect(actionButton).toHaveLength(1);
      expect(actionButton.prop('children')).toBe('Attach');
      expect(actionButton.prop('color')).toBe('primary');
      actionButton.prop('onClick')!({} as any);
      expect(actions.attachPipeline).toHaveBeenCalledTimes(1);
    });
  });
});
