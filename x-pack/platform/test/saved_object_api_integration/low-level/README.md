# Security Domain Low-level Saved Objects API Tests

The purpose of these tests are to verify low-level outcomes of saved object operations as they pertain to Kibana's platform security domain (e.g. authorization, spaces, etc.). These tests are only needed when coverage by the neighboring "security_and_spaces" and "spaces_only" suites is not sufficient. As those suites are more difficult to modify, this low-level suite offers a simplified alternative place to implement additional checks to augment test coverage.

DO NOT ADD TESTS TO THIS SUITE WITHOUT FIRST CONSULTING WITH THE KIBANA-SECURITY TEAM