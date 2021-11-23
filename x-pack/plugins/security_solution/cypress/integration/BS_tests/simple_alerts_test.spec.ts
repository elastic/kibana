import { getCCSEqlRule } from "../../objects/rule";
import { ALERT_DATA_GRID, ALERT_RULE_NAME } from "../../screens/alerts";
import { ALERTS, RULES } from "../../screens/security_header";
import { waitForAlertsIndexToBeCreated, waitForAlertsPanelToBeLoaded } from "../../tasks/alerts";
import { activateRule } from "../../tasks/alerts_detection_rules";
import { createEventCorrelationRule } from "../../tasks/api_calls/rules";
import { cleanKibana } from "../../tasks/common";
import { waitForAlertsToPopulate } from "../../tasks/create_new_rule";
import { loginAndWaitForPageWithoutDateRange } from "../../tasks/login";
import { navigateFromHeaderTo, refreshPage } from "../../tasks/security_header";
import { ALERTS_URL } from "../../urls/navigation";

const addDataScript = 'cypress/integration/BS_tests/send_test_data_to_elasticsearch.py';
const elasticSearchUrl = 'http://localhost:9220/';
const ruleName = `Rule ${Math.floor(Math.random() * 1000)}`;
const indexName = "kuku";

describe("Check alerts for event correlation rule", () => {
    
    before(() => {
        // Deletes all existing rules, cases and more
        cleanKibana();
        // Add test data
        cy.exec(`python3 ${addDataScript} ${elasticSearchUrl}`);
        loginAndWaitForPageWithoutDateRange(ALERTS_URL);
        waitForAlertsPanelToBeLoaded();
        waitForAlertsIndexToBeCreated();
      });

    it("Create a deactivated rule and assert no alerts", () => {
        cy.wrap(getCCSEqlRule()).then(newRule => {
          newRule.index = [`${indexName}*`];
          newRule.customQuery = 'any where nodeName == "minikube"';
          newRule.name = ruleName;
        }).then(newRule => {
          createEventCorrelationRule(newRule, "testing_rule", false);
        });
        cy.log(`Done creating rule ${ruleName}`);
        cy.get(ALERT_DATA_GRID).should("not.exist");
    });

    it("Activate rule and assert alerts for the rule", () => {
      navigateFromHeaderTo(RULES);
      activateRule(0);
      navigateFromHeaderTo(ALERTS);
      waitForAlertsToPopulate(1, {timeout: Cypress.config("pageLoadTimeout")});
      refreshPage();
      cy.get(ALERT_RULE_NAME).first().should('have.text', ruleName);
    })
})