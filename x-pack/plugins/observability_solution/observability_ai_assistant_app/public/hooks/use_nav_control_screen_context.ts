/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import datemath from '@elastic/datemath';
import moment from 'moment';
import { createScreenContextAction } from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from './use_kibana';
import { useObservabilityAIAssistantAppService } from './use_observability_ai_assistant_app_service';

export function useNavControlScreenContext() {
  const service = useObservabilityAIAssistantAppService();

  const {
    services: {
      plugins: {
        start: { data },
      },
    },
  } = useKibana();

  const { from, to } = data.query.timefilter.timefilter.getTime();

  const [href, setHref] = useState(window.location.href);

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args: Parameters<typeof originalPushState>) => {
      originalPushState(...args);
      setHref(window.location.href);
    };

    window.history.replaceState = (...args: Parameters<typeof originalReplaceState>) => {
      originalReplaceState(...args);
      setHref(window.location.href);
    };
    window.addEventListener('popstate', () => {
      setHref(window.location.href);
    });

    window.addEventListener('hashchange', () => {
      setHref(window.location.href);
    });
  }, []);

  useEffect(() => {
    const start = datemath.parse(from)?.format() ?? moment().subtract(1, 'day').toISOString();
    const end = datemath.parse(to)?.format() ?? moment().toISOString();

    return service.setScreenContext({
      screenDescription: `The user is looking at ${href}. The current time range is ${start} - ${end}.`,
      actions: [
        createScreenContextAction(
          {
            name: 'foo',
            description: 'foo',
            parameters: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                },
              },
            },
          },
          async ({}) => {
            return {
              content: 'Action succesfully executed',
            };
          }
        ),
      ],
    });
  }, [service, from, to, href]);
}
