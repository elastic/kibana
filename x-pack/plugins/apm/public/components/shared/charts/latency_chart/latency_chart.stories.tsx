/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { APMServiceContext } from '../../../../context/apm_service/apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import {
  APIReturnType,
  createCallApmApi,
} from '../../../../services/rest/create_call_apm_api';
import { LatencyChart } from './';

interface Args {
  latencyChartResponse: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;
}

const stories: Meta<Args> = {
  title: 'shared/charts/LatencyChart',
  component: LatencyChart,
  argTypes: {
    latencyChartResponse: {
      control: {
        type: 'object',
      },
    },
  },
  decorators: [
    (StoryComponent, { args }) => {
      const { latencyChartResponse } = args as Args;
      const serviceName = 'testService';

      const apmPluginContextMock = {
        core: {
          notifications: {
            toasts: { addWarning: () => {}, addDanger: () => {} },
          },
          http: {
            basePath: { prepend: () => {} },
            get: (endpoint: string) => {
              switch (endpoint) {
                case `/internal/apm/services/${serviceName}/transactions/charts/latency`:
                  return latencyChartResponse;
                default:
                  return {};
              }
            },
          },
          uiSettings: { get: () => '' },
        },
        plugins: { observability: { isAlertingExperienceEnabled: () => true } },
        observabilityRuleTypeRegistry: { getFormatter: () => undefined },
      } as unknown as ApmPluginContextValue;

      createCallApmApi(apmPluginContextMock.core);

      const transactionType = `${Math.random()}`; // So we don't memoize

      return (
        <MemoryRouter
          initialEntries={[
            `/services/${serviceName}/overview?environment=ENVIRONMENT_ALL&kuery=&rangeFrom=now-15m&rangeTo=now&transactionType=request&comparisonEnabled=true&offset=1d`,
          ]}
        >
          <MockApmPluginContextWrapper value={apmPluginContextMock}>
            <KibanaContextProvider services={{ ...apmPluginContextMock.core }}>
              <MockUrlParamsContextProvider
                params={{
                  latencyAggregationType: LatencyAggregationType.avg,
                }}
              >
                <APMServiceContext.Provider
                  value={{
                    serviceName,
                    transactionType,
                    transactionTypes: [],
                    fallbackToTransactions: false,
                  }}
                >
                  <ChartPointerEventContextProvider>
                    <StoryComponent />
                  </ChartPointerEventContextProvider>
                </APMServiceContext.Provider>
              </MockUrlParamsContextProvider>
            </KibanaContextProvider>
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ],
};

export default stories;

export const Example: Story<Args> = () => {
  return <LatencyChart height={300} kuery="" />;
};
Example.args = {
  latencyChartResponse: {
    currentPeriod: {
      overallAvgDuration: 3912.628446632232,
      latencyTimeseries: [
        {
          x: 1622610000000,
          y: 4208.681982447083,
        },
        {
          x: 1622610300000,
          y: 4279.664790174002,
        },
        {
          x: 1622610600000,
          y: 4137.2139896373055,
        },
        {
          x: 1622610900000,
          y: 3982.6822523881347,
        },
        {
          x: 1622611200000,
          y: 4536.218125960061,
        },
        {
          x: 1622611500000,
          y: 3732.4789422135163,
        },
        {
          x: 1622611800000,
          y: 4350.351269035533,
        },
        {
          x: 1622612100000,
          y: 3793.9078812691914,
        },
        {
          x: 1622612400000,
          y: 4274.450577019568,
        },
        {
          x: 1622612700000,
          y: 3860.8989280245023,
        },
        {
          x: 1622613000000,
          y: 4391.058464667006,
        },
        {
          x: 1622613300000,
          y: 3404.659691081216,
        },
        {
          x: 1622613600000,
          y: 4743.44957537155,
        },
        {
          x: 1622613900000,
          y: 4214.091001525166,
        },
        {
          x: 1622614200000,
          y: 4250.700154559506,
        },
        {
          x: 1622614500000,
          y: 3814.481089258699,
        },
        {
          x: 1622614800000,
          y: 10653.246323529413,
        },
        {
          x: 1622615100000,
          y: 4068.8035160289555,
        },
        {
          x: 1622615400000,
          y: 4333.230019493178,
        },
        {
          x: 1622615700000,
          y: 4333.82428115016,
        },
        {
          x: 1622616000000,
          y: 4532.12358974359,
        },
        {
          x: 1622616300000,
          y: 3908.336274001038,
        },
        {
          x: 1622616600000,
          y: 3960.448223350254,
        },
        {
          x: 1622616900000,
          y: 3823.611138491868,
        },
        {
          x: 1622617200000,
          y: 4057.287344913151,
        },
        {
          x: 1622617500000,
          y: 4235.4057539682535,
        },
        {
          x: 1622617800000,
          y: 4038.2624040920714,
        },
        {
          x: 1622618100000,
          y: 3672.8091328886608,
        },
        {
          x: 1622618400000,
          y: 3791.836018957346,
        },
        {
          x: 1622618700000,
          y: 3744.2,
        },
        {
          x: 1622619000000,
          y: 3850.6309760956174,
        },
        {
          x: 1622619300000,
          y: 3644.7181141439205,
        },
        {
          x: 1622619600000,
          y: 3524.808994441637,
        },
        {
          x: 1622619900000,
          y: 3292.7054108216435,
        },
        {
          x: 1622620200000,
          y: 2737.1506919528447,
        },
        {
          x: 1622620500000,
          y: 3606.829304390725,
        },
        {
          x: 1622620800000,
          y: 3564.9021739130435,
        },
        {
          x: 1622621100000,
          y: 3460.8380952380953,
        },
        {
          x: 1622621400000,
          y: 3667.977192093259,
        },
        {
          x: 1622621700000,
          y: 3216.88613625536,
        },
        {
          x: 1622622000000,
          y: 3803.754601226994,
        },
        {
          x: 1622622300000,
          y: 3412.371867007673,
        },
        {
          x: 1622622600000,
          y: 3052.968344577063,
        },
        {
          x: 1622622900000,
          y: 3729.7686965811968,
        },
        {
          x: 1622623200000,
          y: 4686.836363636364,
        },
        {
          x: 1622623500000,
          y: 2971.9769189479334,
        },
        {
          x: 1622623800000,
          y: 2778.008875739645,
        },
        {
          x: 1622624100000,
          y: 3562.3027475375843,
        },
        {
          x: 1622624400000,
          y: 4080.326075949367,
        },
        {
          x: 1622624700000,
          y: 3467.0493765586034,
        },
        {
          x: 1622625000000,
          y: 3492.6954887218044,
        },
        {
          x: 1622625300000,
          y: 3761.7813765182186,
        },
        {
          x: 1622625600000,
          y: 3287.3570332480817,
        },
        {
          x: 1622625900000,
          y: 3450.071392910634,
        },
        {
          x: 1622626200000,
          y: 4051.925287356322,
        },
        {
          x: 1622626500000,
          y: 3557.3268442622953,
        },
        {
          x: 1622626800000,
          y: 3541.3430837878036,
        },
        {
          x: 1622627100000,
          y: 3259.4907546226887,
        },
        {
          x: 1622627400000,
          y: 4360.087576374745,
        },
        {
          x: 1622627700000,
          y: 2857.941555225359,
        },
        {
          x: 1622628000000,
          y: 3200.8869168356996,
        },
        {
          x: 1622628300000,
          y: 4180.898125901009,
        },
        {
          x: 1622628600000,
          y: 3802.3408973697783,
        },
        {
          x: 1622628900000,
          y: 4238.939425051335,
        },
        {
          x: 1622629200000,
          y: 3179.4705021940517,
        },
        {
          x: 1622629500000,
          y: 3201.2916006339146,
        },
        {
          x: 1622629800000,
          y: 3275.699311023622,
        },
        {
          x: 1622630100000,
          y: 3257.324406265791,
        },
        {
          x: 1622630400000,
          y: 3034.4371781668383,
        },
        {
          x: 1622630700000,
          y: 5369.278318810866,
        },
        {
          x: 1622631000000,
          y: 4041.9754016064257,
        },
        {
          x: 1622631300000,
          y: 3714.3182773109243,
        },
        {
          x: 1622631600000,
          y: 3433.1565173628587,
        },
        {
          x: 1622631900000,
          y: 3911.4570990806947,
        },
        {
          x: 1622632200000,
          y: 3399.647921760391,
        },
        {
          x: 1622632500000,
          y: 3406.6709171162333,
        },
        {
          x: 1622632800000,
          y: 3796.1313494099536,
        },
        {
          x: 1622633100000,
          y: 4641.3845376452755,
        },
        {
          x: 1622633400000,
          y: 4476.154203197524,
        },
        {
          x: 1622633700000,
          y: 3615.25256147541,
        },
        {
          x: 1622634000000,
          y: 4720.787442099846,
        },
        {
          x: 1622634300000,
          y: 3572.421187308086,
        },
        {
          x: 1622634600000,
          y: 3945.6472690148034,
        },
        {
          x: 1622634900000,
          y: 3737.5801910507794,
        },
        {
          x: 1622635200000,
          y: 4170.001972386588,
        },
        {
          x: 1622635500000,
          y: 3420.740480961924,
        },
        {
          x: 1622635800000,
          y: 4206.541751527495,
        },
        {
          x: 1622636100000,
          y: 5315.030436917034,
        },
        {
          x: 1622636400000,
          y: 3784.5201995012467,
        },
        {
          x: 1622636700000,
          y: 3948.166,
        },
        {
          x: 1622637000000,
          y: 3856.821,
        },
        {
          x: 1622637300000,
          y: 3463.410723581468,
        },
        {
          x: 1622637600000,
          y: 3747.9292260692464,
        },
        {
          x: 1622637900000,
          y: 3454.205677290837,
        },
        {
          x: 1622638200000,
          y: 4110.846038114343,
        },
        {
          x: 1622638500000,
          y: 3336.22131147541,
        },
        {
          x: 1622638800000,
          y: 4649.731621349446,
        },
        {
          x: 1622639100000,
          y: 3165.643870314083,
        },
        {
          x: 1622639400000,
          y: 4956.4894625922025,
        },
        {
          x: 1622639700000,
          y: 3683.55785750379,
        },
        {
          x: 1622640000000,
          y: 3352.1956841589013,
        },
        {
          x: 1622640300000,
          y: 4620.592957017089,
        },
        {
          x: 1622640600000,
          y: 3428.9030303030304,
        },
        {
          x: 1622640900000,
          y: 3698.219571567673,
        },
        {
          x: 1622641200000,
          y: 4377.621443089431,
        },
        {
          x: 1622641500000,
          y: 5961.083591331269,
        },
        {
          x: 1622641800000,
          y: 3669.294088425236,
        },
        {
          x: 1622642100000,
          y: 3259.020638820639,
        },
        {
          x: 1622642400000,
          y: 3819.455216535433,
        },
        {
          x: 1622642700000,
          y: 3371.4274809160306,
        },
        {
          x: 1622643000000,
          y: 3743.922564102564,
        },
        {
          x: 1622643300000,
          y: 3834.112612612613,
        },
        {
          x: 1622643600000,
          y: 5444.119339371337,
        },
        {
          x: 1622643900000,
          y: 3574.8830908178625,
        },
        {
          x: 1622644200000,
          y: 3768.3267119707266,
        },
        {
          x: 1622644500000,
          y: 4140.902912621359,
        },
        {
          x: 1622644800000,
          y: 3342.3307086614172,
        },
        {
          x: 1622645100000,
          y: 3236.124428643982,
        },
        {
          x: 1622645400000,
          y: 3657.412544620092,
        },
        {
          x: 1622645700000,
          y: 3674.141194331984,
        },
        {
          x: 1622646000000,
          y: 3898.6586586586586,
        },
        {
          x: 1622646300000,
          y: 3124.4311287916457,
        },
        {
          x: 1622646600000,
          y: 3272.2118126272912,
        },
        {
          x: 1622646900000,
          y: 3800.5066872427983,
        },
        {
          x: 1622647200000,
          y: 3578.5175751400916,
        },
        {
          x: 1622647500000,
          y: 3542.9040895813046,
        },
        {
          x: 1622647800000,
          y: 3732.763408521303,
        },
        {
          x: 1622648100000,
          y: 3434.2902750491157,
        },
        {
          x: 1622648400000,
          y: 4330.74908328968,
        },
        {
          x: 1622648700000,
          y: 4577.840615690169,
        },
        {
          x: 1622649000000,
          y: 4781.996879875195,
        },
        {
          x: 1622649300000,
          y: 4025.662721893491,
        },
        {
          x: 1622649600000,
          y: 3477.1844410097888,
        },
        {
          x: 1622649900000,
          y: 3391.0057291666667,
        },
        {
          x: 1622650200000,
          y: 4029.693094629156,
        },
        {
          x: 1622650500000,
          y: 3592.2772633744858,
        },
        {
          x: 1622650800000,
          y: 4179.225288509784,
        },
        {
          x: 1622651100000,
          y: 4873.780174627632,
        },
        {
          x: 1622651400000,
          y: 3727.96688409433,
        },
        {
          x: 1622651700000,
          y: 4258.164556962025,
        },
        {
          x: 1622652000000,
          y: 5636.077639751553,
        },
        {
          x: 1622652300000,
          y: 4770.074738415546,
        },
        {
          x: 1622652600000,
          y: 4078.271392405063,
        },
        {
          x: 1622652900000,
          y: 3408.997037037037,
        },
        {
          x: 1622653200000,
          y: 5453.50645994832,
        },
        {
          x: 1622653500000,
          y: 3975.198969072165,
        },
        {
          x: 1622653800000,
          y: 2694.520754716981,
        },
      ],
    },
    previousPeriod: { latencyTimeseries: [], overallAvgDuration: null },
  },
};

export const NoData: Story<Args> = () => {
  return <LatencyChart height={300} kuery="" />;
};

NoData.args = {
  latencyChartResponse: {
    currentPeriod: { latencyTimeseries: [], overallAvgDuration: null },
    previousPeriod: { latencyTimeseries: [], overallAvgDuration: null },
  },
};
