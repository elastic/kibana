/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('useTourContext', () => {
  /**
   * OLM/D&R team - when you implement your steps, you may or may not want to use local storage. I did not need it for the 'alertsCases' step
   * For now I have commented the local storage tests out. If you end up not using them, please delete. Thanks!
   * describe('localStorage', () => {
   *   let localStorageTourActive: string | null;
   *   let localStorageTourStep: string | null;
   *
   *   beforeAll(() => {
   *     localStorageTourActive = localStorage.getItem(SECURITY_TOUR_ACTIVE_KEY);
   *     localStorage.removeItem(SECURITY_TOUR_ACTIVE_KEY);
   *     localStorageTourStep = localStorage.getItem(SECURITY_TOUR_STEP_KEY);
   *     localStorage.removeItem(SECURITY_TOUR_STEP_KEY);
   *   });
   *
   *   afterAll(() => {
   *     if (localStorageTourActive) {
   *       localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, localStorageTourActive);
   *     }
   *     if (localStorageTourStep) {
   *       localStorage.setItem(SECURITY_TOUR_STEP_KEY, localStorageTourStep);
   *     }
   *   });
   *
   *   test('tour is disabled', () => {
   *     localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(false));
   *     const { result } = renderHook(() => useTourContext(), {
   *       wrapper: TourContextProvider,
   *     });
   *     expect(result.current.isTourShown).toBe(false);
   *   });
   *
   *   test('tour is enabled', () => {
   *     localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(true));
   *     const { result } = renderHook(() => useTourContext(), {
   *       wrapper: TourContextProvider,
   *     });
   *     expect(result.current.isTourShown).toBe(true);
   *   });
   *   test('endTour callback', () => {
   *     localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(true));
   *     let { result } = renderHook(() => useTourContext(), {
   *       wrapper: TourContextProvider,
   *     });
   *     expect(result.current.isTourShown).toBe(true);
   *     act(() => {
   *       result.current.endTour();
   *     });
   *     const localStorageValue = JSON.parse(localStorage.getItem(SECURITY_TOUR_ACTIVE_KEY)!);
   *     expect(localStorageValue).toBe(false);
   *
   *     ({ result } = renderHook(() => useTourContext(), {
   *       wrapper: TourContextProvider,
   *     }));
   *     expect(result.current.isTourShown).toBe(false);
   *   });
   * });
   */
});
