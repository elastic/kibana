/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { determineTooltipContent } from './determine_tooltip_content';
import { ANALYTICS_MESSAGES, API_MESSAGES } from './constants';

describe('determineTooltipContent', () => {
  const BASE_SETTINGS = {
    disabledAt: null,
    enabled: true,
    retentionPolicy: null,
  };

  it('will return nothing if settings are not provided', () => {
    expect(determineTooltipContent(ANALYTICS_MESSAGES, true)).toBeUndefined();
  });

  describe('analytics messages', () => {
    describe('when analytics logs are enabled', () => {
      describe("and they're using the default policy", () => {
        it('will render a retention policy message', () => {
          expect(
            determineTooltipContent(ANALYTICS_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: true,
              retentionPolicy: {
                isDefault: true,
                minAgeDays: 7,
              },
            })
          ).toEqual('Your analytics are being stored for at least 7 days.');
        });
      });

      describe('and there is a custom policy', () => {
        it('will render a retention policy message', () => {
          expect(
            determineTooltipContent(ANALYTICS_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: true,
              retentionPolicy: {
                isDefault: false,
                minAgeDays: 7,
              },
            })
          ).toEqual('You have a custom analytics retention policy.');
        });
      });
    });

    describe('when analytics logs are disabled', () => {
      describe('and there is no disabledAt date', () => {
        it('will render a no logging message', () => {
          expect(
            determineTooltipContent(ANALYTICS_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: false,
              disabledAt: null,
            })
          ).toEqual(
            'Analytics collection has been disabled for all engines. There are no analytics collected.'
          );
        });
      });

      describe('and there is a disabledAt date', () => {
        it('will render a no logging message', () => {
          expect(
            determineTooltipContent(ANALYTICS_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: false,
              disabledAt: 'Thu, 05 Nov 2020 18:57:28 +0000',
            })
          ).toEqual(
            'Analytics collection has been disabled for all engines. The last date analytics were collected was November 5, 2020.'
          );
        });
      });
    });

    describe('when ilm is disabled entirely', () => {
      it('will render a no logging message', () => {
        expect(
          determineTooltipContent(ANALYTICS_MESSAGES, false, {
            ...BASE_SETTINGS,
            enabled: true,
          })
        ).toEqual("App Search isn't managing analytics retention.");
      });
    });
  });

  describe('api messages', () => {
    describe('when analytics logs are enabled', () => {
      describe("and they're using the default policy", () => {
        it('will render a retention policy message', () => {
          expect(
            determineTooltipContent(API_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: true,
              retentionPolicy: {
                isDefault: true,
                minAgeDays: 7,
              },
            })
          ).toEqual('Your logs are being stored for at least 7 days.');
        });
      });

      describe('and there is a custom policy', () => {
        it('will render a retention policy message', () => {
          expect(
            determineTooltipContent(API_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: true,
              retentionPolicy: {
                isDefault: false,
                minAgeDays: 7,
              },
            })
          ).toEqual('You have a custom API log retention policy.');
        });
      });
    });

    describe('when analytics logs are disabled', () => {
      describe('and there is no disabledAt date', () => {
        it('will render a no logging message', () => {
          expect(
            determineTooltipContent(API_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: false,
              disabledAt: null,
            })
          ).toEqual('API logging has been disabled for all engines. There are no logs collected.');
        });
      });

      describe('and there is a disabledAt date', () => {
        it('will render a no logging message', () => {
          expect(
            determineTooltipContent(API_MESSAGES, true, {
              ...BASE_SETTINGS,
              enabled: false,
              disabledAt: 'Thu, 05 Nov 2020 18:57:28 +0000',
            })
          ).toEqual(
            'API logging has been disabled for all engines. The last date logs were collected was November 5, 2020.'
          );
        });
      });
    });

    describe('when ilm is disabled entirely', () => {
      it('will render a no logging message', () => {
        expect(
          determineTooltipContent(API_MESSAGES, false, {
            ...BASE_SETTINGS,
            enabled: true,
          })
        ).toEqual("App Search isn't managing API log retention.");
      });
    });
  });
});
