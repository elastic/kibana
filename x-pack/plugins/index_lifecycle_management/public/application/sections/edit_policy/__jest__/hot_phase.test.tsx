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
  defaultValue?: SerializedPolicy;
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

  const setMaxSize = (value: string, units?: string) => {
    find('hot-selectedMaxSizeStored').simulate('change', { target: { value } });
    if (units) {
      find('hot-selectedMaxSizeStoredUnits.select').simulate('change', {
        target: { value: units },
      });
    }
  };

  const setMaxDocs = (value: string) => {
    find('hot-selectedMaxDocuments').simulate('change', { target: { value } });
  };

  const setMaxAge = (value: string, units?: string) => {
    find('hot-selectedMaxAge').simulate('change', { target: { value } });
    if (units) {
      find('hot-selectedMaxAgeUnits.select').simulate('change', { target: { value: units } });
    }
  };

  const toggleForceMerge = (phase: string) => (checked: boolean) => {
    find(`${phase}-forceMergeSwitch`).simulate('click', { target: { checked } });
  };

  const setForcemergeSegmentsCount = (phase: string) => (value: string) => {
    find(`${phase}-selectedForceMergeSegments`).simulate('change', { target: { value } });
  };

  const setBestCompression = (phase: string) => (checked: boolean) => {
    find(`${phase}-bestCompression`).simulate('click', { target: { checked } });
  };

  const setIndexPriority = (phase: string) => (value: string) => {
    find(`${phase}-phaseIndexPriority`).simulate('change', { target: { value } });
  };

  return {
    ...testBed,
    actions: {
      hot: {
        setMaxSize,
        setMaxDocs,
        setMaxAge,
        toggleRollover,
        toggleForceMerge: toggleForceMerge('hot'),
        setForcemergeSegments: setForcemergeSegmentsCount('hot'),
        setBestCompression: setBestCompression('hot'),
        setIndexPriority: setIndexPriority('hot'),
      },
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
  | 'hot-selectedMaxAgeUnits'
  | string;

describe('<HotPhase />', () => {
  let testBed: TestBed;
  let onChange: jest.MockedFunction<(arg: OnFormUpdateArg<any>) => void>;
  const defaultValue: SerializedPolicy = {
    name: '',
    phases: {
      hot: {
        min_age: '123ms',
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
    test('setting all values', async () => {
      const { actions } = testBed;

      await act(async () => {
        actions.hot.setMaxSize('123', 'mb');
        actions.hot.setMaxDocs('123');
        actions.hot.setMaxAge('123', 'h');
        actions.hot.toggleForceMerge(true);
        actions.hot.setForcemergeSegments('123');
        actions.hot.setBestCompression(true);
        actions.hot.setIndexPriority('123');
      });
      const [arg] = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(arg.data.format()).toMatchInlineSnapshot(`
        Object {
          "phases": Object {
            "hot": Object {
              "actions": Object {
                "forcemerge": Object {
                  "index_codec": "best_compression",
                  "max_num_segments": 123,
                },
                "rollover": Object {
                  "max_age": "123h",
                  "max_docs": 123,
                  "max_size": "123mb",
                },
                "set_priority": Object {
                  "priority": 123,
                },
              },
              "min_age": "123ms",
            },
          },
        }
      `);
    });

    test('toggling rollover', async () => {
      const { actions } = testBed;
      await act(async () => {
        actions.hot.toggleRollover(false);
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
              "min_age": "123ms",
            },
          },
        }
      `);
      await act(async () => {
        actions.hot.toggleRollover(true);
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
              "min_age": "123ms",
            },
          },
        }
      `);
    });
  });
});
