/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { ThresholdVisualization } from './visualization';
import { IndexThresholdAlertParams } from './types';
import { DataPublicPluginStart } from 'src/plugins/data/public/types';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { uiSettingsServiceMock } from 'src/core/public/mocks';
import {
  builtInAggregationTypes,
  builtInComparators,
  getTimeUnitLabel,
  TIME_UNITS,
} from '../../../../triggers_actions_ui/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

jest.mock('../../../../../../src/plugins/kibana_react/public');
jest.mock('./index_threshold_api', () => ({
  getThresholdAlertVisualizationData: jest.fn(() =>
    Promise.resolve({ results: [{ group: 'a', metrics: [['b', 2]] }] })
  ),
}));

const { getThresholdAlertVisualizationData } = jest.requireMock('./index_threshold_api');
// jest.mock('../../../../triggers_actions_ui/public', () => {
//   const original = jest.requireActual('../../../../triggers_actions_ui/public');
//   return {
//     ...original,
//     getIndexPatterns: () => {
//       return ['index1', 'index2'];
//     },
//     getTimeFieldOptions: () => {
//       return [
//         {
//           text: '@timestamp',
//           value: '@timestamp',
//         },
//       ];
//     },
//     getFields: () => {
//       return Promise.resolve([
//         {
//           name: '@timestamp',
//           type: 'date',
//         },
//         {
//           name: 'field',
//           type: 'text',
//         },
//       ]);
//     },
//     getIndexOptions: () => {
//       return Promise.resolve([
//         {
//           label: 'indexOption',
//           options: [
//             {
//               label: 'index1',
//               value: 'index1',
//             },
//             {
//               label: 'index2',
//               value: 'index2',
//             },
//           ],
//         },
//       ]);
//     },
//   };
// });

const dataMock = dataPluginMock.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
dataMock.fieldFormats = ({
  getDefaultInstance: jest.fn(() => ({
    convert: jest.fn((s: unknown) => JSON.stringify(s)),
  })),
} as unknown) as DataPublicPluginStart['fieldFormats'];

describe('ThresholdVisualization', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: uiSettingsServiceMock.createSetupContract(),
      },
    });
  });

  function getAlertParams(overrides = {}) {
    return {
      index: 'test-index',
      aggType: 'count',
      thresholdComparator: '>',
      threshold: [0],
      timeWindowSize: 15,
      timeWindowUnit: 's',
      ...overrides,
    };
  }

  async function setup(alertParams: IndexThresholdAlertParams) {
    const wrapper = mountWithIntl(
      <ThresholdVisualization
        alertParams={alertParams}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    return wrapper;
  }

  test('renders loading message on initial load', async () => {
    const wrapper = mountWithIntl(
      <ThresholdVisualization
        alertParams={getAlertParams()}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
      />
    );
    expect(wrapper.find('[data-test-subj="firstLoad"]').exists()).toBeTruthy();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="firstLoad"]').exists()).toBeFalsy();
    expect(getThresholdAlertVisualizationData).toHaveBeenCalled();
  });

  test('renders error message when getting visualization fails', async () => {
    getThresholdAlertVisualizationData.mockImplementation(() => Promise.reject('oh no'));
    const wrapper = mountWithIntl(
      <ThresholdVisualization
        alertParams={getAlertParams()}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="errorCallout"]').exists()).toBeTruthy();
  });

  // test for callout when no data
  // test for chart components when data is available
  // test that getvisualization is repeatedly called
});
