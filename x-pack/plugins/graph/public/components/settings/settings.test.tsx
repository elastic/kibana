/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTab, EuiListGroupItem, EuiButton, EuiAccordion, EuiFieldText } from '@elastic/eui';
import * as Rx from 'rxjs';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { Settings, AngularProps } from './settings';
import { act } from '@testing-library/react';
import { ReactWrapper } from 'enzyme';
import { UrlTemplateForm } from './url_template_form';
import {
  GraphStore,
  updateSettings,
  loadFields,
  saveTemplate,
  removeTemplate,
} from '../../state_management';
import { createMockGraphStore } from '../../state_management/mocks';
import { Provider } from 'react-redux';
import { UrlTemplate } from '../../types';

describe('settings', () => {
  let store: GraphStore;
  let dispatchSpy: jest.Mock;

  const initialTemplate: UrlTemplate = {
    description: 'template',
    encoder: {
      description: 'test encoder description',
      encode: jest.fn(),
      id: 'test',
      title: 'test encoder',
      type: 'esq',
    },
    url: 'http://example.org',
    icon: {
      class: 'test',
      code: '1',
      label: 'test',
    },
    isDefault: false,
  };

  const angularProps: jest.Mocked<AngularProps> = {
    blacklistedNodes: [
      {
        x: 0,
        y: 0,
        scaledSize: 10,
        parent: null,
        color: 'black',
        data: {
          field: 'A',
          term: '1',
        },
        label: 'blacklisted node 1',
        icon: {
          class: 'test',
          code: '1',
          label: 'test',
        },
      },
      {
        x: 0,
        y: 0,
        scaledSize: 10,
        parent: null,
        color: 'black',
        data: {
          field: 'A',
          term: '1',
        },
        label: 'blacklisted node 2',
        icon: {
          class: 'test',
          code: '1',
          label: 'test',
        },
      },
    ],
    unblacklistNode: jest.fn(),
    canEditDrillDownUrls: true,
  };

  let subject: Rx.BehaviorSubject<jest.Mocked<AngularProps>>;
  let instance: ReactWrapper;

  beforeEach(() => {
    store = createMockGraphStore({}).store;
    store.dispatch(
      updateSettings({
        maxValuesPerDoc: 5,
        minDocCount: 10,
        sampleSize: 12,
        useSignificance: true,
        timeoutMillis: 10000,
      })
    );
    store.dispatch(
      loadFields([
        {
          selected: false,
          color: 'black',
          name: 'B',
          type: 'string',
          icon: {
            class: 'test',
            code: '1',
            label: 'test',
          },
          aggregatable: true,
        },
        {
          selected: false,
          color: 'red',
          name: 'C',
          type: 'string',
          icon: {
            class: 'test',
            code: '1',
            label: 'test',
          },
          aggregatable: true,
        },
      ])
    );
    store.dispatch(
      saveTemplate({
        index: -1,
        template: initialTemplate,
      })
    );
    dispatchSpy = jest.fn(store.dispatch);
    store.dispatch = dispatchSpy;
    subject = new Rx.BehaviorSubject(angularProps);
    instance = mountWithIntl(
      <Provider store={store}>
        <Settings observable={subject.asObservable()} />
      </Provider>
    );
  });

  function toTab(tab: string) {
    act(() => {
      instance
        .find(EuiTab)
        .findWhere(node => node.key() === tab)
        .prop('onClick')!({});
    });
    instance.update();
  }

  function input(label: string) {
    return instance.find({ label }).find('input');
  }

  describe('advanced settings', () => {
    it('should display advanced settings', () => {
      expect(input('Sample size').prop('value')).toEqual(12);
    });

    it('should set advanced settings', () => {
      input('Sample size').prop('onChange')!({ target: { valueAsNumber: 13 } } as React.ChangeEvent<
        HTMLInputElement
      >);

      expect(dispatchSpy).toHaveBeenCalledWith(
        updateSettings(
          expect.objectContaining({
            timeoutMillis: 10000,
            sampleSize: 13,
          })
        )
      );
    });
  });

  describe('blacklist', () => {
    beforeEach(() => {
      toTab('Block list');
    });

    it('should switch tab to blacklist', () => {
      expect(instance.find(EuiListGroupItem).map(item => item.prop('label'))).toEqual([
        'blacklisted node 1',
        'blacklisted node 2',
      ]);
    });

    it('should update on new data', () => {
      act(() => {
        subject.next({
          ...angularProps,
          blacklistedNodes: [
            {
              x: 0,
              y: 0,
              scaledSize: 10,
              parent: null,
              color: 'black',
              data: {
                field: 'A',
                term: '1',
              },
              label: 'blacklisted node 3',
              icon: {
                class: 'test',
                code: '1',
                label: 'test',
              },
            },
          ],
        });
      });

      instance.update();

      expect(instance.find(EuiListGroupItem).map(item => item.prop('label'))).toEqual([
        'blacklisted node 3',
      ]);
    });

    it('should delete node', () => {
      instance
        .find(EuiListGroupItem)
        .at(0)
        .prop('extraAction')!.onClick!({} as any);

      expect(angularProps.unblacklistNode).toHaveBeenCalledWith(angularProps.blacklistedNodes![0]);
    });

    it('should delete all nodes', () => {
      instance
        .find('[data-test-subj="graphUnblacklistAll"]')
        .find(EuiButton)
        .simulate('click');

      expect(angularProps.unblacklistNode).toHaveBeenCalledWith(angularProps.blacklistedNodes![0]);
      expect(angularProps.unblacklistNode).toHaveBeenCalledWith(angularProps.blacklistedNodes![1]);
    });
  });

  describe('url templates', () => {
    function templateForm(index: number) {
      return instance.find(UrlTemplateForm).at(index);
    }

    function insert(formIndex: number, label: string, value: string) {
      act(() => {
        templateForm(formIndex)
          .find({ label })
          .first()
          .find(EuiFieldText)
          .prop('onChange')!({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
      });
      instance.update();
    }

    beforeEach(() => {
      toTab('Drilldowns');
    });

    it('should switch tab to url templates', () => {
      expect(
        instance
          .find(EuiAccordion)
          .at(0)
          .prop('buttonContent')
      ).toEqual('template');
    });

    it('should delete url template', () => {
      templateForm(0)
        .find('EuiButtonEmpty[data-test-subj="graphRemoveUrlTemplate"]')
        .simulate('click');
      expect(dispatchSpy).toHaveBeenCalledWith(removeTemplate(initialTemplate));
    });

    it('should update url template', () => {
      insert(0, 'Title', 'Updated title');
      act(() => {
        templateForm(0)
          .find('form')
          .simulate('submit');
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        saveTemplate({ index: 0, template: { ...initialTemplate, description: 'Updated title' } })
      );
    });

    it('should add url template', async () => {
      act(() => {
        instance.find('EuiButton[data-test-subj="graphAddNewTemplate"]').simulate('click');
      });
      instance.update();

      insert(1, 'URL', 'test-url');
      insert(1, 'Title', 'Title');

      act(() => {
        templateForm(1)
          .find('form')
          .simulate('submit');
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        saveTemplate({
          index: -1,
          template: expect.objectContaining({ description: 'Title', url: 'test-url' }),
        })
      );
    });
  });
});
