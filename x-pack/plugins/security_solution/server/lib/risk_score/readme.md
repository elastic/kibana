# Risk Score API

### API usage

The risk score API has one route with one method

1. GET - `getRiskScoreDeprecatedRoute`
2. REQUEST:
    ```typescript
      GET /internal/risk_score/deprecated
      {
        indexName: 'ml_host_risk_score_latest'
      }
      ```
3. RESPONSE:
    ```typescript
      {
          isDeprecated: boolean;
       }
      ```
4. This route is called from `useRiskScore` hook.