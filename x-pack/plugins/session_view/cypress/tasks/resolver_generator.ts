

/**
 * Authenticates with Kibana, visits the specified `url`, and waits for the
 * Kibana global nav to be displayed before continuing
 */
export const resolverGenerator = () => {
  cy.exec('node ../security_solution/scripts/endpoint/resolver_generator --fleet ');
};
