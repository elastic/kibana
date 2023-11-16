/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const addSeverityAndEventTypeInBody = (
  bodyString: string,
  severity: string,
  eventType: string
) => {
  let bodyObj = bodyString;
  try {
    bodyObj = JSON.parse(bodyString);
  } catch {
    // do nothing
  }

  return JSON.stringify({
    hits: {
      hits: {
        _source: {
          rawData: bodyObj,
          'event.type': eventType,
          'kibana.alert.severity': severity,
        },
      },
    },
  });
};
