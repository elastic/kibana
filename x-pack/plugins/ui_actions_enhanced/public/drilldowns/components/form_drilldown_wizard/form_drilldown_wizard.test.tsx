/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { FormDrilldownWizard } from './form_drilldown_wizard';
import { render as renderTestingLibrary, fireEvent } from '@testing-library/react';
import { txtNameOfDrilldown } from './i18n';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';

const otherProps = {
  actionFactoryContext: { triggers: [] as TriggerId[] },
  triggers: ['VALUE_CLICK_TRIGGER', 'SELECT_RANGE_TRIGGER', 'FILTER_TRIGGER'] as TriggerId[],
  getTriggerInfo: (id: TriggerId) => ({ id } as Trigger),
  onSelectedTriggersChange: () => {},
};

describe('<FormDrilldownWizard>', () => {
  test('renders without crashing', () => {
    const div = document.createElement('div');
    render(<FormDrilldownWizard onNameChange={() => {}} {...otherProps} />, div);
  });

  describe('[name=]', () => {
    test('if name not provided, uses to empty string', () => {
      const div = document.createElement('div');

      render(<FormDrilldownWizard {...otherProps} />, div);

      const input = div.querySelector('[data-test-subj="drilldownNameInput"]') as HTMLInputElement;

      expect(input?.value).toBe('');
    });

    test('can set initial name input field value', () => {
      const div = document.createElement('div');

      render(<FormDrilldownWizard name={'foo'} {...otherProps} />, div);

      const input = div.querySelector('[data-test-subj="drilldownNameInput"]') as HTMLInputElement;

      expect(input?.value).toBe('foo');

      render(<FormDrilldownWizard name={'bar'} {...otherProps} />, div);

      expect(input?.value).toBe('bar');
    });

    test('fires onNameChange callback on name change', () => {
      const onNameChange = jest.fn();
      const utils = renderTestingLibrary(
        <FormDrilldownWizard name={''} onNameChange={onNameChange} {...otherProps} />
      );
      const input = utils.getByLabelText(txtNameOfDrilldown);

      expect(onNameChange).toHaveBeenCalledTimes(0);

      fireEvent.change(input, { target: { value: 'qux' } });

      expect(onNameChange).toHaveBeenCalledTimes(1);
      expect(onNameChange).toHaveBeenCalledWith('qux');

      fireEvent.change(input, { target: { value: 'quxx' } });

      expect(onNameChange).toHaveBeenCalledTimes(2);
      expect(onNameChange).toHaveBeenCalledWith('quxx');
    });
  });
});
