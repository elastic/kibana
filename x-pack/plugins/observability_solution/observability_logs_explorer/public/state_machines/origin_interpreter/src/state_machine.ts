/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { createMachine, InterpreterFrom } from 'xstate';
import { ObservabilityLogsExplorerHistory } from '../../../types';
import { FEEDBACK_DELAY_MS } from './constants';
import { DEFAULT_CONTEXT } from './defaults';
import { initializeFromLocationState } from './location_state_service';
import { createRequestFeedbackNotifier } from './notifications';
import {
  OriginInterpreterContext,
  OriginInterpreterEvent,
  OriginInterpreterTypeState,
} from './types';

export const createPureOriginInterpreterStateMachine = (initialContext: OriginInterpreterContext) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCAFQ1AMwEs8wA6AVwDtrWAXagQz2oC9IAYgDaABgC6iUDlSxqnVMykgsiAIwAOAMz0NagEwBWUdoBsWgOxaAnEYA0IAJ7rt9UxesWD+2xf2WAXwCHNExcAmIyCho6ejZ5bl4+NigAMQoAWwBVQjxBCEUGNgA3VABrBlDsfCIScipaIo5E-hT01GzchBLUAGMuBWYxcWHlGTlB5VUEYw1dfQ1RQ30LC0NrbX0HZwQ1CwAWemtDLTV991FTPWWtIJD0aoi66Ma45p5W5jTMnLySCkI9HwA0oRAy9Cq4VqUQasXinA+yS+7U6eG6zFK-UGw1GSBA4wSiimiFm80Wy1W60220QenoxlEjP2J32alEmmsdxAkJqkXqMSaCURKQAIgMuAA1ahgADu+UKb1KFQhDyhfJecPeSVF4qlsvRmIG1EUOIkY1khKUeOmPkM9D8pkMFm0bMpFhpM3Obi0tqdxk0Fi5PKeMIFbyF2q+YvYkulcv+RCBeBBYJVYV5z1hgoRkag0dj+p6WONQwkuOkFsm1sQtvt+kdztOojdHquonoah91h9WkWS1MQdVGdDr3hLSRUAAwop2BQ8KQuMwwHhYPKl4rypUhyH+aOtZ8pzO5wulyuDX0jSay2a8QSq6BphZTNZ6Po1O+jMy++YPScLEdLi0UwDG7Z9jkHdMdw1bNxxSadmFnVB50XZdVwTQFgXYUFCHBYNoV3TUIwPeDEOQ09YHPYsrxGG8KwmEtiQQJ8XzfD9DC-RkfycRB9msdt9kuBYNA0Dxlg0Adgm5bd8Og8McwPABlGN2DAEiuDYEg1yaJUt0gmSszk2CviUgZVJndSl0ISjL1LGjJFvSsGOrBAtC0Q4tFEc5DHE-YPI0XjTA9NRDCdI4rhEvR9HrEKIMefSwzHYVjOUsyEIszT0KTFMcLTOL1QMxLcxMlS1I0qyixs017Loy1GNc9zPMdHy-ICoLDDZehzg0Wx3z4vtbkkvD8oS-cBAgegIHFWAwHYBTlzAXpBnoYoPkmzhjPmxaS0EZAAEkFIAFQwAA5AB9A6AHlTsnAAJABBY6AHEMAU8t8UcolnOE-9fLWZ9NEsAwgtc9ttG6p0fQsQCNFitVMxGoixomqaZrmugtsUZbVqNDb0cGQQslIEU7qO07iYOu6FIwA7Tqp5AMEnA7dou463rvJyH1pETOssQx-u0Lwtm43Yzjtbz1jZGwDg2Ab7j04a90RyBkZjabZs2paVt4NaUjRhb8fJynqdpjB6cZ5mzoAJRey7rdO1I7t25AsmttmPqtTmEG+nm-usAHBba9rOp67trGffz-Nh4cCJgxFlbWrg1b1jHmDiCA6AJomSYwMmSaNmm6YZpmWbd+jPs9s5PFff19jWZsDH2IWdk7MP7UdUx-GbdxTGbKOoIK0b45R9W8ZLNOM8NqmC9NouLdO63Douu2Hadl2MFL2rnMr-8jHZWvjEFxvgcZehTn0fZIr48WYcG6SFcI+SkYTpONbHxgcB1qNdTjLSN2VIb4aK0fkPVWqNX6Y3fp-PM39CwYgvNia81V3plw9ioGsbI1CvnfJ5SwtdTB4OBmoF83k+KmHcCcNyN85Z5UAQ-ccIDE5gNHhAj+ONoExj1PGQgAIspYVTAAkcdC47jWfkw-Wb9WHrXYQWGU1kEF2XNCgxib52RYLZL9PBBDhadncPQEwfF-BXGWKIBYfd4pAPoSI4eyclqQLYcVVKMYyq-x6P-O+tDY5JAYS-Zhqc7FSIcaVSyciSxVUUZvT2KjMGsRwQcJ8Wjm7sUwdYEOlgnxOk5LfeWHjDLCJVowke4iWFQMCeZZxmVMLYVwu4wRnj+DeLESnJgkjdYpSCSQEJ1EN73jQQgFR+h6TnGsL5TQQlz5BWCnMEwEsTGeSipk6hcNam5K8eNXoR4kKPQoO-WATBWCDwgIIXax1dpMzuntAAWjnScLMDqWwusgU6j17mE1OndUgu1ukc16bYQ4ngyHuDDs2ICgVtFrB+syICfse5QxsGY++dSkbrIQnOLZqAdnjzAIIQ2p0JS7QwAAdVOoTcmGARRfPLr098T5T6+T4s6RYWhvIen0J5O0TLgpkPWN3FY8KcmFXqWsjZeA0UYuoOnLFJLs7XVufcx5pAHqm1erRZBESqWdh0EsWu-kiG1zWEFDQJxdAbHaqIYZVxnQSUWdHWSAqkXCtFTgXZ-i4LCpPKhFxcC3HZOWXa5WyLSKOudS0r4JFjwoTPBVeRFLUHTF+UcJ8ZCPAwpBUFPi7kNjnGlm+c1fLfUHPoAG1F2ynXNKgWGpC7qVyCAqcmPhOUBExxWYKwtDqS3BvLW6iNFEo2hMQeEnpcbz4JoBcm4FZC01V0NWoHuYd8F9SCJJZgqAIBwGUI26CA7vnTAALSgp2Duu0KTj0npPVFPNTaWB+ogFuyl0wj7aI0AMwFBxOx8ydG+C9trRptB+LkW9saazOmNf5aZ+CfTMjai+PYngjCdgOJ5bQX6B6Ix1BwuMAHGLuFbPg0+6xTV6EuMyK1UkfVNrta6lFlbu2YecsYAZjciGms8qyVlhhfxRQ7F2KW58Fh+2QwjR+rTTLtMILRz22HtHtRYhyN87gpZMoExY4R4nensR0E6PQz5WTsm+h6Tw7ZvIwuZBSZ8stSM0PzUrKxoDCkp1U9MCW9JnQzuGRgvT2ilhTMNSk8+axOz7CU0I1Z+SfFFNTlrcV9jwGoPZnexA5hiEue0+5kSx9-xgxScJXiWqFkWaWeRgtoi7NLXFXQBz6gjDPq8H7KkAkbDpd0DYfs6wTGdiC4ihpJWJFQPzJwiruwRIMf8rxXyzZmSdmPi+VyfFJawfEoYDrzan7WJi2W+xbSymWQG4Y0wnURvNYg0yiZ-ksHn20LxXsIUSMbpQ8AoVVGRXtoG05zTrmdOaDS9oshL5hkUL9D3KKVD8s2ru5Y1tj2g17OvQNtYcwZ2smy+Qp8WggrOnbCHYCLmNX6CW9eiHgb22YoG2cDqrJWR+Dwf6DQaaTG6GluJNy13nR44LUWzZROXWhq7eRAbiXnNabc7pr7zdDV7cQ+1CbthnyBkXUAA */
  createMachine<OriginInterpreterContext, OriginInterpreterEvent, OriginInterpreterTypeState>(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'OriginInterpreter',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'initializingFromLocationState',
        },
        initializingFromLocationState: {
          invoke: {
            src: 'initializeFromLocationState',
          },
          on: {
            INITIALIZED_WITH_NO_ORIGIN: '#done',
            INITIALIZED_WITH_ONBOARDING_ORIGIN: '#onboarding',
          },
        },
        onboarding: {
          id: 'onboarding',
          initial: 'waiting',
          states: {
            waiting: {
              after: {
                [FEEDBACK_DELAY_MS]: {
                  target: '#done',
                  actions: ['requestFeedback'],
                },
              },
            },
          },
        },
        done: {
          id: 'done',
          type: 'final',
        },
      },
    },
    {
      actions: {},
      guards: {},
    }
  );

export interface OriginInterpreterStateMachineDependencies {
  initialContext?: OriginInterpreterContext;
  history: ObservabilityLogsExplorerHistory;
  toasts: IToasts;
}

export const createOriginInterpreterStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  history,
  toasts,
}: OriginInterpreterStateMachineDependencies) =>
  createPureOriginInterpreterStateMachine(initialContext).withConfig({
    actions: {
      requestFeedback: createRequestFeedbackNotifier(toasts),
    },
    services: {
      initializeFromLocationState: initializeFromLocationState({ history }),
    },
  });

export type OriginInterpreterService = InterpreterFrom<typeof createOriginInterpreterStateMachine>;
