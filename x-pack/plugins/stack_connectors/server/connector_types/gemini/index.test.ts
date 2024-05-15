import { getConnectorType } from './index';



describe('getConnectorType', () => {
  it('should return a SubActionConnectorType object', () => {
    const connectorType = getConnectorType();
    expect(connectorType).toHaveProperty('id');
    expect(connectorType).toHaveProperty('name');
    expect(connectorType).toHaveProperty('getService');
    expect(connectorType).toHaveProperty('schema');
    expect(connectorType).toHaveProperty('validators');
    expect(connectorType).toHaveProperty('supportedFeatureIds');
    expect(connectorType).toHaveProperty('minimumLicenseRequired');
    expect(connectorType).toHaveProperty('renderParameterTemplates');
  });

  it('should return a connector type with the correct ID and name', () => {
    const connectorType = getConnectorType();
    expect(connectorType.id).toEqual('.gemini');
    expect(connectorType.name).toEqual('Amazon Bedrock');
  });

  it('should return a connector type with the correct getService function', () => {
    const connectorType = getConnectorType();
    expect(connectorType.getService).toBeInstanceOf(Function);
  });

  it('should return a connector type with the correct schema', () => {
    const connectorType = getConnectorType();
    expect(connectorType.schema).toHaveProperty('config');
    expect(connectorType.schema).toHaveProperty('secrets');
  });

  it('should return a connector type with the correct validators', () => {
    const connectorType = getConnectorType();
    expect(connectorType.validators).toHaveLength(1);
    expect(connectorType.validators).toContain(
      'generative_ai_for_security_connector_validator'
    );
  });

  it('should return a connector type with the correct supportedFeatureIds', () => {
    const connectorType = getConnectorType();
    expect(connectorType.supportedFeatureIds).toHaveLength(2);
    expect(connectorType.supportedFeatureIds).toContain(
      'generative_ai_for_security_connector_feature_id'
    );
    expect(connectorType.supportedFeatureIds).toContain(
      'generative_ai_for_observability_connector_feature_id'
    );
  });

  it('should return a connector type with the correct minimumLicenseRequired', () => {
    const connectorType = getConnectorType();
    expect(connectorType.minimumLicenseRequired).toEqual('enterprise');
  });

  it('should return a connector type with the correct renderParameterTemplates function', () => {
    const connectorType = getConnectorType();
    expect(connectorType.renderParameterTemplates).toBeInstanceOf(Function);
  });
  
});
