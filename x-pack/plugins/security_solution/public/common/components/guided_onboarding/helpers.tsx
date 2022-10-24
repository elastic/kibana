/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

interface Delayed {
  children: React.ReactNode;
  waitBeforeShow?: number;
}
export const Delayed = ({ children, waitBeforeShow = 500 }: Delayed) => {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsShown(true);
    }, waitBeforeShow);
    return () => clearTimeout(timer);
  }, [waitBeforeShow]);

  return isShown ? <>{children}</> : <></>;
};

/**
 * OLM/D&R team - when you implement your steps, you may or may not want to use local storage. I did not need it for the 'alertsCases' step
 * For now I have commented the local storage helpers out. If you end up not using them, please delete. Thanks!
 * export const SECURITY_TOUR_ACTIVE_KEY = 'guidedOnboarding.security.tourActive';
 * export const SECURITY_TOUR_STEP_KEY = 'guidedOnboarding.security.tourStep';
 *
 * const getIsTourActiveFromLocalStorage = (): boolean => {
 *   const localStorageValue = localStorage.getItem(SECURITY_TOUR_ACTIVE_KEY);
 *   return localStorageValue ? JSON.parse(localStorageValue) : false;
 * };
 *
 * export const saveIsTourActiveToLocalStorage = (isTourActive: boolean): void => {
 *   localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(isTourActive));
 * };
 *
 * export const getTourStepFromLocalStorage = (): number => {
 *   return Number(localStorage.getItem(SECURITY_TOUR_STEP_KEY) ?? 1);
 * };
 * const saveTourStepToLocalStorage = (step: number): void => {
 *   localStorage.setItem(SECURITY_TOUR_STEP_KEY, JSON.stringify(step));
 * };
 */
