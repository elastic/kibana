Feature: Indices

  Scenario: User updates APM default index pattern
    Given a user browses the APM UI settings page
    When the user updates APM indices
    Then default indices were updated
    Then reset indices