/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import React, { ReactNode } from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { ServiceNameContext } from '../context/service_name_context';
import { useServiceName } from './use_service_name';

describe('useServiceName', () => {
  describe('with no router', () => {
    it('throws an error', () => {
      expect(renderHook(() => useServiceName()).result.error).toBeInstanceOf(
        TypeError
      );
    });
  });

  describe('with a router', () => {
    describe('with no matched route', () => {
      describe('with no service name context', () => {
        it('returns undefined', () => {
          expect(
            renderHook(() => useServiceName(), { wrapper: MemoryRouter }).result
              .current
          ).toBeUndefined();
        });
      });

      describe('with a service name context', () => {
        describe('with a defined service name', () => {
          it('returns the service name from the context', () => {
            function Wrapper({ children }: { children?: ReactNode }) {
              return (
                <MemoryRouter>
                  <ServiceNameContext.Provider value="test service name">
                    {children}
                  </ServiceNameContext.Provider>
                </MemoryRouter>
              );
            }

            expect(
              renderHook(() => useServiceName(), { wrapper: Wrapper }).result
                .current
            ).toEqual('test service name');
          });
        });

        describe('with no defined service name', () => {
          it('returns undefined', () => {
            function Wrapper({ children }: { children?: ReactNode }) {
              return (
                <MemoryRouter>
                  <ServiceNameContext.Provider value={undefined}>
                    {children}
                  </ServiceNameContext.Provider>
                </MemoryRouter>
              );
            }

            expect(
              renderHook(() => useServiceName(), { wrapper: Wrapper }).result
                .current
            ).toBeUndefined();
          });
        });
      });
    });

    describe('with a matched route', () => {
      it('returns the service name', () => {
        function Wrapper({ children }: { children?: ReactNode }) {
          return (
            <MemoryRouter initialEntries={['/services/test/errors']}>
              <Route path="/services/:serviceName/errors">{children}</Route>
            </MemoryRouter>
          );
        }

        expect(
          renderHook(() => useServiceName(), { wrapper: Wrapper }).result
            .current
        ).toEqual('test');
      });
    });
  });
});
