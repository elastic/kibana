/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { FormatSelector } from './format_selector';
import { act } from 'react-dom/test-utils';
import { GenericIndexPatternColumn } from '../../..';
import { LensAppServices } from '../../../app_plugin/types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock, docLinksServiceMock } from '@kbn/core/public/mocks';
import { EuiComboBox, EuiFieldNumber } from '@elastic/eui';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

const bytesColumn: GenericIndexPatternColumn = {
  label: 'Max of bytes',
  dataType: 'number',
  isBucketed: false,

  // Private
  operationType: 'max',
  sourceField: 'bytes',
  params: { format: { id: 'bytes' } },
};

const getDefaultProps = () => ({
  onChange: jest.fn(),
  selectedColumn: bytesColumn,
  docLinks: docLinksServiceMock.createStartContract(),
});

function createMockServices(): LensAppServices {
  const services = coreMock.createStart();
  services.uiSettings.get.mockImplementation(() => '0.0');
  return {
    ...services,
    docLinks: {
      links: {
        indexPatterns: { fieldFormattersNumber: '' },
      },
    },
  } as unknown as LensAppServices;
}

function mountWithServices(component: React.ReactElement) {
  const WrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return (
      <I18nProvider>
        <KibanaContextProvider services={createMockServices()}>{children}</KibanaContextProvider>
      </I18nProvider>
    );
  };
  return mount(<WrappingComponent>{component}</WrappingComponent>);
}
describe('FormatSelector', () => {
  it('updates the format decimals', () => {
    const props = getDefaultProps();
    const component = mountWithServices(<FormatSelector {...props} />);
    act(() => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .find(EuiFieldNumber)
        .prop('onChange')!({
        currentTarget: { value: '10' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 10 } });
  });
  it('updates the format decimals to upper range when input exceeds the range', () => {
    const props = getDefaultProps();
    const component = mountWithServices(<FormatSelector {...props} />);
    act(() => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .find(EuiFieldNumber)
        .prop('onChange')!({
        currentTarget: { value: '100' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 15 } });
  });
  it('updates the format decimals to lower range when input is smaller than range', () => {
    const props = getDefaultProps();
    const component = mountWithServices(<FormatSelector {...props} />);
    act(() => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .find(EuiFieldNumber)
        .prop('onChange')!({
        currentTarget: { value: '-2' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 0 } });
  });
  it('updates the suffix', () => {
    const props = getDefaultProps();
    const component = mountWithServices(<FormatSelector {...props} />);
    act(() => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatSuffix"]')
        .last()
        .prop('onChange')!({
        currentTarget: { value: 'GB' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    component.update();
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { suffix: 'GB' } });
  });

  describe('Duration', () => {
    it('hides the decimals and compact controls for humanize approximate output', () => {
      const originalProps = getDefaultProps();
      let component = mountWithServices(
        <FormatSelector
          {...{
            ...originalProps,
            selectedColumn: {
              ...originalProps.selectedColumn,
              params: { format: { id: 'duration' } },
            },
          }}
        />
      );

      expect(component.exists('[data-test-subj="indexPattern-dimension-formatDecimals"]')).toBe(
        false
      );
      expect(component.exists('[data-test-subj="lns-indexpattern-dimension-formatCompact"]')).toBe(
        false
      );

      act(() => {
        component
          .find('[data-test-subj="indexPattern-dimension-duration-end"]')
          .find(EuiComboBox)
          .prop('onChange')!([{ label: 'Hours', value: 'asHours' }]);
      });
      component = component.update();

      expect(component.exists('[data-test-subj="indexPattern-dimension-formatDecimals"]')).toBe(
        true
      );
      expect(component.exists('[data-test-subj="lns-indexpattern-dimension-formatCompact"]')).toBe(
        true
      );
    });
  });
});
