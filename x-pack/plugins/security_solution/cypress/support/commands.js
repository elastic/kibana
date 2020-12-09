/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import { findIndex } from 'lodash/fp';

const getFindRequestConfig = (searchStrategyName, factoryQueryType) => {
  if (!factoryQueryType) {
    return {
      options: { strategy: searchStrategyName },
    };
  }

  return {
    options: { strategy: searchStrategyName },
    request: { factoryQueryType },
  };
};

Cypress.Commands.add(
  'stubSearchStrategyApi',
  function (stubObject, factoryQueryType, searchStrategyName = 'securitySolutionSearchStrategy') {
    cy.intercept('POST', '/internal/bsearch', (req) => {
      const findRequestConfig = getFindRequestConfig(searchStrategyName, factoryQueryType);
      const requestIndex = findIndex(findRequestConfig, req.body.batch);

      if (requestIndex > -1) {
        return req.reply((res) => {
          const responseObjectsArray = res.body.split('\n').map((responseString) => {
            try {
              return JSON.parse(responseString);
            } catch {
              return responseString;
            }
          });
          const responseIndex = findIndex({ id: requestIndex }, responseObjectsArray);

          const stubbedResponseObjectsArray = [...responseObjectsArray];
          stubbedResponseObjectsArray[responseIndex] = {
            ...stubbedResponseObjectsArray[responseIndex],
            result: {
              ...stubbedResponseObjectsArray[responseIndex].result,
              ...stubObject,
            },
          };

          const stubbedResponse = stubbedResponseObjectsArray
            .map((object) => {
              try {
                return JSON.stringify(object);
              } catch {
                return object;
              }
            })
            .join('\n');

          res.send(stubbedResponse);
        });
      }

      req.reply();
    });
  }
);

Cypress.Commands.add(
  'attachFile',
  {
    prevSubject: 'element',
  },
  (input, fileName, fileType = 'text/plain') => {
    cy.fixture(fileName).then((content) => {
      const blob = Cypress.Blob.base64StringToBlob(btoa(content), fileType);
      const testFile = new File([blob], fileName, { type: fileType });
      const dataTransfer = new DataTransfer();

      dataTransfer.items.add(testFile);
      input[0].files = dataTransfer.files;
      return input;
    });
  }
);

const waitUntil = (subject, fn, options = {}) => {
  const { interval = 200, timeout = 5000 } = options;
  let attempts = Math.floor(timeout / interval);

  const completeOrRetry = (result) => {
    if (result) {
      return result;
    }
    if (attempts < 1) {
      throw new Error(`Timed out while retrying, last result was: {${result}}`);
    }
    cy.wait(interval, { log: false }).then(() => {
      attempts--;
      // eslint-disable-next-line no-use-before-define
      return evaluate();
    });
  };

  const evaluate = () => {
    const result = fn(subject);

    if (result && result.then) {
      return result.then(completeOrRetry);
    } else {
      return completeOrRetry(result);
    }
  };

  return evaluate();
};

Cypress.Commands.add('waitUntil', { prevSubject: 'optional' }, waitUntil);
