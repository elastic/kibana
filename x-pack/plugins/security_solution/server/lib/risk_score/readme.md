# Risk Score API

### API usage

The risk score API has one route with one method

1. GET - `getRiskScoreIndexStatusRoute`
2. REQUEST:
    ```typescript
      GET /internal/risk_score/index_status
      {
        indexName: 'ml_host_risk_score_latest'
      }
      ```
3. RESPONSE:
    ```typescript
      {
          isDeprecated: boolean;
          isEnabled: boolean;
       }
      ```
4. This route is called from `useRiskScore` hook.