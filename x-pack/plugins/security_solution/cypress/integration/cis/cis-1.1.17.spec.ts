 // @ts-nocheck
 
 const ruleNum = "1.1.17"
 const targetFilePath = "/etc/kubernetes/controller-manager.conf"
 const ruleName = "CIS " + ruleNum
 const goodPremission = 644;
 const badOwnerPremission = 744;
 const badGroupPremission = 654;
 const badOtherPremission = 645;
 const encode64 = (str: string):string => Buffer.from(str, 'binary').toString('base64');
 const basicAuth = "Basic " + encode64("elastic:changeme");
 
 interface ruleResult {
     evaluation: "passed" | "failed",
     evidence: { filemode: String }
 }
 
 const passedResult: ruleResult = {
     evaluation : "passed",
     evidence : { filemode : goodPremission.toString() }
 };
 const failedOwnerResult: ruleResult = {
     evaluation : "failed",
     evidence : { filemode : badOwnerPremission.toString() }
 };
 const failedGroupResult: ruleResult = {
     evaluation : "failed",
     evidence : { filemode : badGroupPremission.toString() }
 };
 const failedOtherResult: ruleResult = {
     evaluation : "failed",
     evidence : { filemode : badOtherPremission.toString() }
 };
 
 
 const changeFileMode = (mode: number, file: String) => {
     cy.exec(`minikube ssh 'sudo chmod ${mode} ${file}'`)
 }
 
 const assertRuleEvaluation = (expectedResult: ruleResult, name: String=ruleName) => {
     cy.waitUntil(() => 
         cy.request({
             url: "http://localhost:9220/kubebeat*/_search",
             method: "GET",
             headers: { Authorization: basicAuth },
             body: {
                 "size": 1,
                 "sort": { "@timestamp": "desc" },
                 "query": {"terms": { "rule.tags": [ruleName] }}},
             }).then((res) => 
                 JSON.stringify(res.body.hits.hits[0]._source.result) == JSON.stringify(expectedResult) &&
                 res.body.hits.hits[0]._source.rule.tags.includes(name) === true &&
                 res.status === 200 &&
                 res.body.hits.hits.length === 1
             ), { interval: 500, timeout: 15000 })
             .then(() => 
                 cy.log(`${ruleName} ${expectedResult.evaluation} as expected with premissions ${expectedResult.evidence.filemode}.`)
             );
 }
 
 describe(`Test ${ruleName}`, () => {
 
     it("Assert rule passes", () => {
         assertRuleEvaluation(passedResult);
     });
     
     it("Fail CIS rule with bad owner permission", () => {
         changeFileMode(badOwnerPremission, targetFilePath);
         assertRuleEvaluation(failedOwnerResult);
     });
 
     it("Fail CIS rule with bad group permission", () => {
         changeFileMode(badGroupPremission, targetFilePath);
         assertRuleEvaluation(failedGroupResult);
     });
 
     it("Fail CIS rule with bad other permission", () => {
         changeFileMode(badOtherPremission, targetFilePath);
         assertRuleEvaluation(failedOtherResult);
     });
 
     it("Fix CIS rule and assert rule passes", () => {
         changeFileMode(goodPremission, targetFilePath);
         assertRuleEvaluation(passedResult);
     });
 
 });
 