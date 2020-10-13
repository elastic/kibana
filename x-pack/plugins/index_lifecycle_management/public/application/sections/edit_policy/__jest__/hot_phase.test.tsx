/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useEffect } from 'react';
import { act } from '@testing-library/react-hooks';

import { registerTestBed } from '../../../../../../../test_utils';

import { SerializedPolicy } from '../../../../../common/types';
import { Form, useForm, OnFormUpdateArg } from '../../../../shared_imports';

import { HotPhase } from '../components';

import { createSerializer } from '../serializer';
import { deserializer } from '../deserializer';

interface Props {
  defaultValue: SerializedPolicy;
  onChange: (arg: OnFormUpdateArg<any>) => void;
  serializer: any;
}

const MyForm: FunctionComponent<Props> = ({ defaultValue, onChange, serializer }) => {
  const { form } = useForm({ defaultValue, serializer, deserializer });
  useEffect(() => {
    const sub = form.subscribe(onChange);
    return sub.unsubscribe;
  }, [form, onChange]);
  return (
    <Form form={form}>
      <HotPhase setWarmPhaseOnRollover={() => {}} />
    </Form>
  );
};

const setupTestBed = registerTestBed<TestSubject>(MyForm);

const setup = async (props: Props) => {
  const testBed = await setupTestBed(props);
  const { find } = testBed;
  const toggleRollover = (checked: boolean) => {
    find('rolloverSwitch').simulate('click', { target: { checked } });
  };
  return {
    ...testBed,
    actions: {
      toggleRollover,
    },
  };
};

type SetupReturn = ReturnType<typeof setup>;

type TestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

type TestSubject =
  | 'rolloverSwitch'
  | 'rolloverSettingsRequired'
  | 'hot-selectedMaxSizeStored'
  | 'hot-selectedMaxSizeStoredUnits'
  | 'hot-selectedMaxDocuments'
  | 'hot-selectedMaxAge'
  | 'hot-selectedMaxAgeUnits';

describe('<HotPhase />', () => {
  let testBed: TestBed;
  let onChange: jest.MockedFunction<(arg: OnFormUpdateArg<any>) => void>;
  const defaultValue: SerializedPolicy = {
    name: '',
    phases: {
      hot: {
        actions: {
          rollover: {},
        },
      },
    },
  };
  beforeEach(async () => {
    onChange = jest.fn();
    testBed = await setup({ onChange, defaultValue, serializer: createSerializer(defaultValue) });
  });

  describe('serialization', () => {
    test('toggling rollover', async () => {
      const { actions } = testBed;
      await act(async () => {
        actions.toggleRollover(false);
      });
      const [noRolloverFormUpdate] = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(noRolloverFormUpdate.data.format()).toMatchInlineSnapshot(`
        Object {
          "phases": Object {
            "hot": Object {
              "actions": Object {
                "set_priority": Object {
                  "priority": 100,
                },
              },
            },
          },
        }
      `);
      await act(async () => {
        actions.toggleRollover(true);
      });
      const [rolloverFormUpdate] = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(rolloverFormUpdate.data.format()).toMatchInlineSnapshot(`
        Object {
          "phases": Object {
            "hot": Object {
              "actions": Object {
                "rollover": Object {
                  "max_age": "30d",
                  "max_size": "50gb",
                },
                "set_priority": Object {
                  "priority": 100,
                },
              },
            },
          },
        }
      `);
    });
  });
});
