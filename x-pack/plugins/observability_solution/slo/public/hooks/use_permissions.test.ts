/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sloFeatureId } from '@kbn/observability-shared-plugin/common';
import { useKibana } from '../utils/kibana_react';
import { useFetchSloGlobalDiagnosis } from './use_fetch_global_diagnosis';
import { usePermissions } from './use_permissions';

jest.mock('../utils/kibana_react');
jest.mock('./use_fetch_global_diagnosis');

const useKibanaMock = useKibana as jest.Mock;
const useFetchSloGlobalDiagnosisMock = useFetchSloGlobalDiagnosis as jest.Mock;

describe('usePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is loading until diagnosis is done', () => {
    useKibanaMock.mockReturnValue({
      services: {
        application: { capabilities: { [sloFeatureId]: { read: true, write: true } } },
      },
    });
    useFetchSloGlobalDiagnosisMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { data, isLoading } = usePermissions();

    expect(isLoading).toBe(true);
    expect(data).toBe(undefined);
  });

  describe('hasAllReadRequested', () => {
    it('returns hasAllReadRequested = true when both write capabilities and read privileges are true', () => {
      useKibanaMock.mockReturnValue({
        services: {
          application: { capabilities: { [sloFeatureId]: { read: true, write: false } } },
        },
      });
      useFetchSloGlobalDiagnosisMock.mockReturnValue({
        data: {
          userPrivileges: {
            read: { has_all_requested: true },
            write: { has_all_requested: false },
          },
        },
        isLoading: false,
      });

      const { data } = usePermissions();

      expect(data?.hasAllReadRequested).toBe(true);
    });

    it('returns hasAllReadRequested = false when read capabilities is false and read privileges is true', () => {
      useKibanaMock.mockReturnValue({
        services: {
          application: { capabilities: { [sloFeatureId]: { read: false, write: false } } },
        },
      });
      useFetchSloGlobalDiagnosisMock.mockReturnValue({
        data: {
          userPrivileges: {
            read: { has_all_requested: true },
            write: { has_all_requested: false },
          },
        },
        isLoading: false,
      });

      const { data } = usePermissions();

      expect(data?.hasAllReadRequested).toBe(false);
    });

    it('returns hasAllReadRequested = false when read capabilities is true and read privileges is false', () => {
      useKibanaMock.mockReturnValue({
        services: {
          application: { capabilities: { [sloFeatureId]: { read: true, write: false } } },
        },
      });
      useFetchSloGlobalDiagnosisMock.mockReturnValue({
        data: {
          userPrivileges: {
            read: { has_all_requested: false },
            write: { has_all_requested: false },
          },
        },
        isLoading: false,
      });

      const { data } = usePermissions();

      expect(data?.hasAllReadRequested).toBe(false);
    });
  });

  describe('hasAllWriteRequested', () => {
    it('returns hasAllWriteRequested = true when both write capabilities and write privileges are true', () => {
      useKibanaMock.mockReturnValue({
        services: {
          application: { capabilities: { [sloFeatureId]: { read: false, write: true } } },
        },
      });
      useFetchSloGlobalDiagnosisMock.mockReturnValue({
        data: {
          userPrivileges: {
            read: { has_all_requested: false },
            write: { has_all_requested: true },
          },
        },
        isLoading: false,
      });

      const { data } = usePermissions();

      expect(data?.hasAllWriteRequested).toBe(true);
    });

    it('returns hasAllWriteRequested = false when write capabilities is false and write privileges is true', () => {
      useKibanaMock.mockReturnValue({
        services: {
          application: { capabilities: { [sloFeatureId]: { read: false, write: false } } },
        },
      });
      useFetchSloGlobalDiagnosisMock.mockReturnValue({
        data: {
          userPrivileges: {
            read: { has_all_requested: false },
            write: { has_all_requested: true },
          },
        },
        isLoading: false,
      });

      const { data } = usePermissions();

      expect(data?.hasAllWriteRequested).toBe(false);
    });

    it('returns hasAllWriteRequested = false when write capabilities is true and write privileges is false', () => {
      useKibanaMock.mockReturnValue({
        services: {
          application: { capabilities: { [sloFeatureId]: { read: false, write: true } } },
        },
      });
      useFetchSloGlobalDiagnosisMock.mockReturnValue({
        data: {
          userPrivileges: {
            read: { has_all_requested: false },
            write: { has_all_requested: false },
          },
        },
        isLoading: false,
      });

      const { data } = usePermissions();

      expect(data?.hasAllWriteRequested).toBe(false);
    });
  });
});
