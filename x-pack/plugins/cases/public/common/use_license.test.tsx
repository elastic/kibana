/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from './mock';
import { useLicense } from './use_license';

describe('useLicense', () => {
  describe('isAtLeast', () => {
    it('returns true on a valid basic license', () => {
      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeast('basic')).toBeTruthy();
    });

    it('returns false on a valid basic license', () => {
      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeast('platinum')).toBeFalsy();
    });

    it('returns false if the license is not available', async () => {
      const license = licensingMock.createLicense();
      // @ts-expect-error: we need to change the isAvailable to test the hook
      license.isAvailable = false;

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeast('basic')).toBeFalsy();
    });

    it('returns false if the license is not valid', async () => {
      const license = licensingMock.createLicense({
        license: { status: 'invalid' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeast('basic')).toBeFalsy();
    });
  });

  describe('isAtLeastPlatinum', () => {
    it('returns true on a valid platinum license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeastPlatinum()).toBeTruthy();
    });

    it('returns false on a valid platinum license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'gold' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeastPlatinum()).toBeFalsy();
    });
  });

  describe('isAtLeastGold', () => {
    it('returns true on a valid gold license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'gold' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeastGold()).toBeTruthy();
    });

    it('returns false on a valid gold license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'basic' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeastGold()).toBeFalsy();
    });
  });

  describe('isAtLeastEnterprise', () => {
    it('returns true on a valid enterprise license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'enterprise' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeastEnterprise()).toBeTruthy();
    });

    it('returns false on a valid enterprise license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.isAtLeastEnterprise()).toBeFalsy();
    });
  });

  describe('getLicense', () => {
    it('returns the license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'enterprise' },
      });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders license={license}>{children}</TestProviders>
          ),
        }
      );

      expect(result.current.getLicense()).toEqual(license);
    });
  });
});
