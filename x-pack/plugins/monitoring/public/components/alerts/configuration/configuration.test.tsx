/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mockUseEffects } from '../../../jest.helpers';
import { shallow, ShallowWrapper } from 'enzyme';
import { Legacy } from '../../../legacy_shims';
import { AlertsConfiguration, AlertsConfigurationProps } from './configuration';

jest.mock('../../../legacy_shims', () => ({
  Legacy: {
    shims: {
      kfetch: jest.fn(),
    },
  },
}));

const defaultProps: AlertsConfigurationProps = {
  emailAddress: 'test@elastic.co',
  onDone: jest.fn(),
};

describe('Configuration', () => {
  it('should render high level steps', () => {
    const component = shallow(<AlertsConfiguration {...defaultProps} />);
    expect(component.find('EuiSteps').shallow()).toMatchSnapshot();
  });

  function getStep(component: ShallowWrapper, index: number) {
    return component.find('EuiSteps').shallow().find('EuiStep').at(index).children().shallow();
  }

  describe('shallow view', () => {
    it('should render step 1', () => {
      const component = shallow(<AlertsConfiguration {...defaultProps} />);
      const stepOne = getStep(component, 0);
      expect(stepOne).toMatchSnapshot();
    });

    it('should render step 2', () => {
      const component = shallow(<AlertsConfiguration {...defaultProps} />);
      const stepTwo = getStep(component, 1);
      expect(stepTwo).toMatchSnapshot();
    });

    it('should render step 3', () => {
      const component = shallow(<AlertsConfiguration {...defaultProps} />);
      const stepThree = getStep(component, 2);
      expect(stepThree).toMatchSnapshot();
    });
  });

  describe('selected action', () => {
    const actionId = 'a123b';
    let component: ShallowWrapper;
    beforeEach(async () => {
      mockUseEffects(2);

      (Legacy.shims.kfetch as jest.Mock).mockImplementation(() => {
        return {
          data: [
            {
              actionTypeId: '.email',
              id: actionId,
              config: {},
            },
          ],
        };
      });

      component = shallow(<AlertsConfiguration {...defaultProps} />);
    });

    it('reflect in Step1', async () => {
      const steps = component.find('EuiSteps').dive();
      expect(steps.find('EuiStep').at(0).prop('title')).toBe('Select email action');
      expect(steps.find('Step1').prop('selectedEmailActionId')).toBe(actionId);
    });

    it('should enable Step2', async () => {
      const steps = component.find('EuiSteps').dive();
      expect(steps.find('Step2').prop('isDisabled')).toBe(false);
    });

    it('should enable Step3', async () => {
      const steps = component.find('EuiSteps').dive();
      expect(steps.find('Step3').prop('isDisabled')).toBe(false);
    });
  });

  describe('edit action', () => {
    let component: ShallowWrapper;
    beforeEach(async () => {
      (Legacy.shims.kfetch as jest.Mock).mockImplementation(() => {
        return {
          data: [],
        };
      });

      component = shallow(<AlertsConfiguration {...defaultProps} />);
    });

    it('disable Step2', async () => {
      const steps = component.find('EuiSteps').dive();
      expect(steps.find('Step2').prop('isDisabled')).toBe(true);
    });

    it('disable Step3', async () => {
      const steps = component.find('EuiSteps').dive();
      expect(steps.find('Step3').prop('isDisabled')).toBe(true);
    });
  });

  describe('no email address', () => {
    let component: ShallowWrapper;
    beforeEach(async () => {
      (Legacy.shims.kfetch as jest.Mock).mockImplementation(() => {
        return {
          data: [
            {
              actionTypeId: '.email',
              id: 'actionId',
              config: {},
            },
          ],
        };
      });

      component = shallow(<AlertsConfiguration {...defaultProps} emailAddress="" />);
    });

    it('should disable Step3', async () => {
      const steps = component.find('EuiSteps').dive();
      expect(steps.find('Step3').prop('isDisabled')).toBe(true);
    });
  });
});
