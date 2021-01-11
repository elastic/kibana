Feature: Custom links

  Scenario: User creates Custom links
    Given a user browses the APM UI settings page
    When the user creates a custom link
    Then a new custom link is shown in the table
    Then delete custom link

  Scenario: User edits Custom links
    Given a user browses the APM UI settings page
    When the user edits a custom link
    Then custom link was edited
    Then delete custom link


