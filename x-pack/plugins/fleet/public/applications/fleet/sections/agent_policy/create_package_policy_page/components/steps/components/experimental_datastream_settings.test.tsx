/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import type { RegistryDataStream } from '../../../../../../../../../common/types';

import { ExperimentDatastreamSettings } from './experimental_datastream_settings';

jest.mock('../../../../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../../../../hooks'),
    FleetStatusProvider: (props: any) => {
      return props.children;
    },
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
  };
});

describe('ExperimentDatastreamSettings', () => {
  describe('Synthetic source', () => {
    it('should be enabled an not checked by default', () => {
      const mockSetNewExperimentalDataFeatures = jest.fn();
      const res = createFleetTestRendererMock().render(
        <ExperimentDatastreamSettings
          registryDataStream={{ type: 'logs', dataset: 'test' } as unknown as RegistryDataStream}
          experimentalDataFeatures={[]}
          setNewExperimentalDataFeatures={mockSetNewExperimentalDataFeatures}
        />
      );

      const syntheticSourceSwitch = res.getByTestId(
        'packagePolicyEditor.syntheticSourceExperimentalFeature.switch'
      );
      expect(syntheticSourceSwitch).not.toBeChecked();
      expect(syntheticSourceSwitch).toBeEnabled();
      expect(mockSetNewExperimentalDataFeatures).not.toBeCalled();
    });

    it('should be checked if the regitry datastream define source_mode synthetic', () => {
      const mockSetNewExperimentalDataFeatures = jest.fn();
      const res = createFleetTestRendererMock().render(
        <ExperimentDatastreamSettings
          registryDataStream={
            {
              type: 'logs',
              dataset: 'test',
              elasticsearch: {
                source_mode: 'synthetic',
              },
            } as unknown as RegistryDataStream
          }
          experimentalDataFeatures={[]}
          setNewExperimentalDataFeatures={mockSetNewExperimentalDataFeatures}
        />
      );

      const syntheticSourceSwitch = res.getByTestId(
        'packagePolicyEditor.syntheticSourceExperimentalFeature.switch'
      );
      expect(syntheticSourceSwitch).toBeChecked();
      expect(syntheticSourceSwitch).toBeEnabled();
      expect(mockSetNewExperimentalDataFeatures).not.toBeCalled();
    });

    it('should be not checked and disabled if the regitry datastream define source_mode synthetic and the user disabled it', () => {
      const mockSetNewExperimentalDataFeatures = jest.fn();
      const res = createFleetTestRendererMock().render(
        <ExperimentDatastreamSettings
          registryDataStream={
            {
              type: 'logs',
              dataset: 'test',
              elasticsearch: {
                source_mode: 'synthetic',
              },
            } as unknown as RegistryDataStream
          }
          experimentalDataFeatures={[
            {
              data_stream: 'logs-test',
              features: {
                synthetic_source: false,
                tsdb: false,
              },
            },
          ]}
          setNewExperimentalDataFeatures={mockSetNewExperimentalDataFeatures}
        />
      );

      const syntheticSourceSwitch = res.getByTestId(
        'packagePolicyEditor.syntheticSourceExperimentalFeature.switch'
      );
      expect(syntheticSourceSwitch).not.toBeChecked();
      expect(syntheticSourceSwitch).toBeEnabled();
      expect(mockSetNewExperimentalDataFeatures).not.toBeCalled();
    });

    it('should not be checked and not enabled if the regitry datastream define source_mode default', () => {
      const mockSetNewExperimentalDataFeatures = jest.fn();
      const res = createFleetTestRendererMock().render(
        <ExperimentDatastreamSettings
          registryDataStream={
            {
              type: 'logs',
              dataset: 'test',
              elasticsearch: {
                source_mode: 'default',
              },
            } as unknown as RegistryDataStream
          }
          experimentalDataFeatures={[]}
          setNewExperimentalDataFeatures={mockSetNewExperimentalDataFeatures}
        />
      );

      const syntheticSourceSwitch = res.getByTestId(
        'packagePolicyEditor.syntheticSourceExperimentalFeature.switch'
      );
      expect(syntheticSourceSwitch).not.toBeChecked();
      expect(syntheticSourceSwitch).not.toBeEnabled();
      expect(mockSetNewExperimentalDataFeatures).not.toBeCalled();
    });

    it('should not mutate original experimental feature if a user change one', () => {
      const mockSetNewExperimentalDataFeatures = jest.fn();
      const experimentalDataFeatures = [
        {
          data_stream: 'logs-test',
          features: {
            synthetic_source: true,
            tsdb: false,
          },
        },
      ];
      const res = createFleetTestRendererMock().render(
        <ExperimentDatastreamSettings
          registryDataStream={
            {
              type: 'logs',
              dataset: 'test',
            } as unknown as RegistryDataStream
          }
          experimentalDataFeatures={experimentalDataFeatures}
          setNewExperimentalDataFeatures={mockSetNewExperimentalDataFeatures}
        />
      );

      act(() => {
        fireEvent.click(
          res.getByTestId('packagePolicyEditor.syntheticSourceExperimentalFeature.switch')
        );
      });
      expect(mockSetNewExperimentalDataFeatures).toBeCalled();
      expect(mockSetNewExperimentalDataFeatures.mock.calls[0][0]).toEqual([
        {
          data_stream: 'logs-test',
          features: {
            synthetic_source: false,
            tsdb: false,
          },
        },
      ]);
      expect(experimentalDataFeatures).toEqual([
        {
          data_stream: 'logs-test',
          features: {
            synthetic_source: true,
            tsdb: false,
          },
        },
      ]);
    });
  });
});
