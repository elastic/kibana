/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ONE_MINUTE = 60000;
const FIVE_MINUTES = ONE_MINUTE * 5;
const TEN_MINUTES = ONE_MINUTE * 10;
const THIRTY_MINUTES = ONE_MINUTE * 30;
const ONE_HOUR = ONE_MINUTE * 60;
const TWO_HOURS = ONE_HOUR * 2;
const EIGHT_HOURS = ONE_HOUR * 8;
const TWELVE_HOURS = ONE_HOUR * 12;
const ONE_DAY = ONE_HOUR * 24;
const TWO_DAYS = ONE_DAY * 2;
const SEVEN_DAYS = ONE_DAY * 7;
const FOURTEEN_DAYS = ONE_DAY * 14;
const THIRTY_DAYS = ONE_DAY * 30;
const SIXTY_DAYS = ONE_DAY * 60;
const NINETY_DAYS = ONE_DAY * 90;
const HALF_YEAR = ONE_DAY * 180;
const ONE_YEAR = ONE_DAY * 365;

export const telemetryTimeRangeFormatter = (ms: number): string => {
  if (ms < ONE_MINUTE) return '1. Less than 1 minute';
  if (ms >= ONE_MINUTE && ms < FIVE_MINUTES) return '2. 1-5 minutes';
  if (ms >= FIVE_MINUTES && ms < TEN_MINUTES) return '3. 5-10 minutes';
  if (ms >= TEN_MINUTES && ms < THIRTY_MINUTES) return '4. 10-30 minutes';
  if (ms >= THIRTY_MINUTES && ms < ONE_HOUR) return '5. 30-60 minutes';
  if (ms >= ONE_HOUR && ms < TWO_HOURS) return '6. 1-2 hours';
  if (ms >= TWO_HOURS && ms < EIGHT_HOURS) return '7. 2-8 hours';
  if (ms >= EIGHT_HOURS && ms < TWELVE_HOURS) return '8. 8-12 hours';
  if (ms >= TWELVE_HOURS && ms < ONE_DAY) return '9. 12-24 hours';
  if (ms >= ONE_DAY && ms < TWO_DAYS) return '10. 1-2 days';
  if (ms >= TWO_DAYS && ms < SEVEN_DAYS) return '11. 2-7 days';
  if (ms >= SEVEN_DAYS && ms < FOURTEEN_DAYS) return '12. 7-14 days';
  if (ms >= FOURTEEN_DAYS && ms < THIRTY_DAYS) return '13. 14-30 days';
  if (ms >= THIRTY_DAYS && ms < SIXTY_DAYS) return '14. 30-60 days';
  if (ms >= SIXTY_DAYS && ms < NINETY_DAYS) return '15. 60-90 days';
  if (ms >= NINETY_DAYS && ms < HALF_YEAR) return '16. 90-180 days';
  if (ms >= HALF_YEAR && ms < ONE_YEAR) return '17. 180-365 days';
  return '18. More than 1 year';
};
