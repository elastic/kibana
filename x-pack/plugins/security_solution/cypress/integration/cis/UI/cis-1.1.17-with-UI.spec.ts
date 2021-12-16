import { cleanKibana } from "../../tasks/common";
import { loginAndWaitForPageWithoutDateRange } from "../../tasks/login";


const ruleNum = "1.1.17"
const targetFilePath = "/etc/kubernetes/controller-manager.conf"
const ruleName = "CIS " + ruleNum
const goodPremission = 644;
const badPremission = 777;
const dataIntervalInMiliseconds = 3000
const ruleUpdateRetries = 
    {
        "runMode": 3,
        "openMode": 3
    }

const getIndexPatternRequestBody = (indexPatten: String) => 
    {
        return {"attributes":{"fieldAttrs":"{}","title":indexPatten,"timeFieldName":"@timestamp","fields":"[]","typeMeta":"{}","runtimeFieldMap":"{}"}}
    }

const createDataView = (indexPatten: String) => {
    cy.request({
        method:'POST',
        url: "/api/saved_objects/index-pattern",
        body: getIndexPatternRequestBody(indexPatten),
        headers: { 'kbn-xsrf': 'cypress-creds' }
    })
}

const changeFileMode = (mode: number, file: String) => {
    cy.exec(`minikube ssh 'sudo chmod ${mode} ${file}'`)
}

const assertRulePassed = (name: String=ruleName) => {
    cy.get(`.euiBadge[title="${name}"]`, { timeout: 2000})
    .parentsUntil(".euiTableRow")
    .last()
    .parent()
    .invoke('text')
    .should((text) => {
        expect(text).to.contain(name);
        expect(text).to.contain("PASSED");
        expect(text).not.to.contain("FAILED");
    });
}

const assertRuleFailed = (name: String=ruleName) => {
    cy.get(`.euiBadge[title="${name}"]`, { timeout: 2000})
    .first()
    .parentsUntil(".euiTableRow")
    .last()
    .parent()
    .invoke('text')
    .should((text) => {
        expect(text).to.contain(name);
        expect(text).to.contain("FAILED");
        expect(text).not.to.contain("PASSED");
    });
}

const refreshTable = () => {
    cy.get('.euiSuperUpdateButton')
      .first()
      .click({ force: true })
      .should('not.have.text', 'Updating');
  };

describe("Test CIS 1.1.17", () => {
    
    before(function () {
        cleanKibana();
        createDataView("kubebeat*");
        loginAndWaitForPageWithoutDateRange("/app/security/csp/findings");
    });
    
    it("Fail CIS rule and assert findings", { retries: ruleUpdateRetries }, () => {
        assertRulePassed();
        changeFileMode(badPremission, targetFilePath);
        cy.wait(dataIntervalInMiliseconds);
        refreshTable()
        assertRuleFailed();
    });

    it("Fix CIS rule and assert findings", { retries: ruleUpdateRetries }, () => {
        assertRuleFailed();
        changeFileMode(goodPremission, targetFilePath);
        cy.wait(dataIntervalInMiliseconds);
        refreshTable()
        assertRulePassed();
    });

});
